#!/bin/bash

# Remix Icon Updater
# This script fetches icon metadata from the Remix Icon GitHub repository
# and optionally downloads the icon files to the local assets directory.
#
# Features:
#   - SHA-based change detection: Stores GitHub's file SHA hash locally
#     to efficiently detect changes without downloading files
#   - Smart downloads: Only downloads new or modified icons
#   - Parallel processing: Downloads up to 10 icons concurrently
#   - Dry-run mode: Preview changes without modifying files
#
# Usage:
#   ./update-icons.sh          # Normal mode - downloads icons
#   ./update-icons.sh --dry-run # Dry-run mode - only lists changes without downloading
#
# Change Detection:
#   Each downloaded icon gets a corresponding .sha file that stores the
#   GitHub SHA hash. On subsequent runs, we compare the local SHA with
#   the remote SHA - if they match, we skip the download entirely.
#   This is much faster than downloading and comparing file contents.

set -euo pipefail

# Configuration
CATEGORIES_URL="https://api.github.com/repos/Remix-Design/RemixIcon/contents/icons"
ACCEPT_HEADER="application/vnd.github+json"
API_VERSION="2022-11-28"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="${SCRIPT_DIR}/../assets"
CATALOGUE_FILE="${ASSETS_DIR}/catalogue.json"
MAX_PARALLEL_DOWNLOADS=10

# Logging function - always outputs to stderr to keep stdout clean for data
# This separation is crucial: functions return data via stdout (echo),
# while log messages go to stderr. This prevents log text from corrupting
# JSON data when using command substitution like: data=$(fetch_categories)
log() {
  echo "$@" >&2
}

# Parse command line arguments
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  log "[DRY-RUN] Running in DRY-RUN mode - no files will be modified"
  log ""
fi

# Fetch categories from GitHub API
# Returns: JSON array of category objects
fetch_categories() {
  log "Fetching categories..."
  
  local temp_file
  temp_file=$(mktemp)
  local http_code
  
  http_code=$(curl -sL -w "%{http_code}" -o "${temp_file}" \
    -H "Accept: ${ACCEPT_HEADER}" \
    -H "X-GitHub-Api-Version: ${API_VERSION}" \
    "${CATEGORIES_URL}")
  
  # Check if request was successful
  if [[ "${http_code}" != "200" ]]; then
    log "ERROR: Failed to fetch categories (HTTP ${http_code})"
    log "Response: $(cat "${temp_file}")"
    rm -f "${temp_file}"
    exit 1
  fi
  
  # Validate JSON response
  if ! jq empty "${temp_file}" 2>/dev/null; then
    log "ERROR: Invalid JSON response from GitHub API"
    log "Response: $(cat "${temp_file}")"
    rm -f "${temp_file}"
    exit 1
  fi
  
  # Filter to only directory entries
  local result
  result=$(jq '[.[] | select(.type == "dir")]' "${temp_file}")
  rm -f "${temp_file}"
  echo "${result}"
}

# Fetch icons for a specific category
# Args:
#   $1 - category name
# Returns: JSON array of icon file objects
fetch_icons() {
  local category="$1"
  log "  Fetching icons for category: ${category}"
  
  # URL encode the category name (handle spaces and special characters)
  local encoded_category
  encoded_category=$(printf '%s' "${category}" | jq -sRr @uri)
  
  local temp_file
  temp_file=$(mktemp)
  local http_code
  
  http_code=$(curl -sL -w "%{http_code}" -o "${temp_file}" \
    -H "Accept: ${ACCEPT_HEADER}" \
    -H "X-GitHub-Api-Version: ${API_VERSION}" \
    "${CATEGORIES_URL}/${encoded_category}")
  
  # Check if request was successful
  if [[ "${http_code}" != "200" ]]; then
    log "  ERROR: Failed to fetch icons for ${category} (HTTP ${http_code})"
    rm -f "${temp_file}"
    return 1
  fi
  
  # Validate JSON response
  if ! jq empty "${temp_file}" 2>/dev/null; then
    log "  ERROR: Invalid JSON response for ${category}"
    rm -f "${temp_file}"
    return 1
  fi
  
  # Filter to only file entries (SVG files)
  local result
  result=$(jq '[.[] | select(.type == "file")]' "${temp_file}")
  rm -f "${temp_file}"
  echo "${result}"
}

# Download a single icon file if needed
# Args:
#   $1 - download URL
#   $2 - icon path (e.g., "icons/Weather/windy-line.svg")
#   $3 - remote SHA hash
# Returns: 0 if downloaded/up-to-date, 1 if failed, 2 if skipped (unchanged)
download_icon() {
  local download_url="$1"
  local icon_path="$2"
  local remote_sha="$3"
  local file_path="${ASSETS_DIR}/${icon_path}"
  local sha_file="${file_path}.sha"
  local dir_path
  dir_path="$(dirname "${file_path}")"
  
  if [[ "${DRY_RUN}" == true ]]; then
    log "    [DRY-RUN] Would download: ${icon_path}"
    return 0
  fi
  
  # If file exists, check SHA to see if it has changed
  if [[ -f "${file_path}" ]] && [[ -f "${sha_file}" ]]; then
    local local_sha
    local_sha=$(cat "${sha_file}")
    
    if [[ "${local_sha}" == "${remote_sha}" ]]; then
      # SHA matches - file is up to date, skip download
      return 2
    fi
    
    log "    [CHANGED] ${icon_path} (SHA changed)"
  fi
  
  # Create directory if it doesn't exist
  mkdir -p "${dir_path}"
  
  # Download the icon
  if curl -sL "${download_url}" -o "${file_path}"; then
    # Save the SHA for future comparisons
    echo "${remote_sha}" > "${sha_file}"
    
    if [[ -f "${file_path}" ]] && [[ "${local_sha:-}" != "" ]]; then
      log "    [UPDATED] ${icon_path}"
    else
      log "    [NEW] ${icon_path}"
    fi
    return 0
  else
    log "    [FAIL] Failed to download: ${icon_path}"
    return 1
  fi
}

# Process all icons for a category
# Args:
#   $1 - category name
#   $2 - JSON array of icon objects (with sha field)
process_category_icons() {
  local category="$1"
  local icons_json="$2"
  local icon_count
  icon_count=$(echo "${icons_json}" | jq 'length')
  
  log "  Total icons for ${category}: ${icon_count}"
  
  # Extract icon data and build array for catalogue
  local icon_data
  icon_data=$(echo "${icons_json}" | jq '[.[] | {
    name: (.name | sub("\\.svg$"; "")),
    path: .path,
    download_url: .download_url
  }]')
  
  # Track statistics
  local new_count=0
  local modified_count=0
  local unchanged_count=0
  
  # Process icons
  if [[ "${DRY_RUN}" == true ]]; then
    # In dry-run mode, check SHA without downloading
    local icon_index=0
    while [[ ${icon_index} -lt ${icon_count} ]]; do
      local icon_path
      local remote_sha
      icon_path=$(echo "${icons_json}" | jq -r ".[${icon_index}].path")
      remote_sha=$(echo "${icons_json}" | jq -r ".[${icon_index}].sha")
      
      local file_path="${ASSETS_DIR}/${icon_path}"
      local sha_file="${file_path}.sha"
      
      if [[ ! -f "${file_path}" ]]; then
        log "    [NEW] ${icon_path}"
        new_count=$((new_count + 1))
      elif [[ ! -f "${sha_file}" ]]; then
        log "    [MODIFIED] ${icon_path} (no SHA metadata)"
        modified_count=$((modified_count + 1))
      else
        local local_sha
        local_sha=$(cat "${sha_file}")
        if [[ "${local_sha}" != "${remote_sha}" ]]; then
          log "    [MODIFIED] ${icon_path}"
          modified_count=$((modified_count + 1))
        else
          unchanged_count=$((unchanged_count + 1))
        fi
      fi
      
      icon_index=$((icon_index + 1))
    done
    
    log "  Stats: ${new_count} new, ${modified_count} modified, ${unchanged_count} unchanged"
  else
    # Download icons if they don't exist or SHA has changed
    local icon_index=0
    
    while [[ ${icon_index} -lt ${icon_count} ]]; do
      local pids=()
      
      # Start batch of parallel downloads
      while [[ ${#pids[@]} -lt ${MAX_PARALLEL_DOWNLOADS} ]] && [[ ${icon_index} -lt ${icon_count} ]]; do
        local download_url
        local icon_path
        local remote_sha
        download_url=$(echo "${icons_json}" | jq -r ".[${icon_index}].download_url")
        icon_path=$(echo "${icons_json}" | jq -r ".[${icon_index}].path")
        remote_sha=$(echo "${icons_json}" | jq -r ".[${icon_index}].sha")
        
        # Download (will check SHA internally and skip if unchanged)
        download_icon "${download_url}" "${icon_path}" "${remote_sha}" &
        pids+=($!)
        
        icon_index=$((icon_index + 1))
      done
      
      # Wait for batch to complete
      for pid in "${pids[@]}"; do
        wait "${pid}" && : || {
          local exit_code=$?
          # exit code 2 means skipped (unchanged)
          if [[ ${exit_code} -eq 2 ]]; then
            unchanged_count=$((unchanged_count + 1))
          fi
        }
      done
    done
    
    log "  Processed ${icon_count} icons (${unchanged_count} unchanged)"
  fi
  
  echo "${icon_data}"
}

# Main function
main() {
  log "Starting Remix Icon update process"
  log ""
  
  # Fetch all categories
  local categories
  categories=$(fetch_categories)
  local category_names
  category_names=$(echo "${categories}" | jq -r '.[].name')
  local category_count
  category_count=$(echo "${category_names}" | wc -l | xargs)
  
  log "Found ${category_count} categories"
  log ""
  
  # Initialize catalogue structure
  local catalogue='{"categories":[]}'
  
  # Process each category
  while IFS= read -r category; do
    log "Processing category: ${category}"
    log "---"
    
    # Fetch icons for this category
    local icons
    icons=$(fetch_icons "${category}")
    
    # Process icons and get icon data
    local icon_data
    icon_data=$(process_category_icons "${category}" "${icons}")
    
    # Add to catalogue
    catalogue=$(echo "${catalogue}" | jq \
      --arg cat "${category}" \
      --argjson icons "${icon_data}" \
      '.categories += [{name: $cat, icons: $icons}]')
    
    log "  [OK] Completed: ${category}"
    log ""
  done <<< "${category_names}"
  
  # Write catalogue to file
  if [[ "${DRY_RUN}" == true ]]; then
    log "[DRY-RUN] Would write catalogue to: ${CATALOGUE_FILE}"
    echo ""
    echo "Preview of catalogue structure:"
    echo "${catalogue}" | jq '.categories[] | {name: .name, icon_count: (.icons | length)}' | head -20
  else
    echo "${catalogue}" | jq '.' > "${CATALOGUE_FILE}"
    log "[OK] Successfully wrote catalogue to: ${CATALOGUE_FILE}"
  fi
  
  echo ""
  echo "Icon update process completed!"
}

# Run main function
main
