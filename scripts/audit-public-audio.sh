#!/usr/bin/env bash
# Dream Tales V2 — audit narration objects that the retired /api/upload_audio
# endpoint made world-readable with makePublic().
#
# Usage (requires an operator with Storage Admin on the project):
#   gcloud auth login
#   ./scripts/audit-public-audio.sh gs://YOUR_BUCKET            # report only
#   ./scripts/audit-public-audio.sh gs://YOUR_BUCKET --revoke   # remove allUsers access
#
# The script never deletes objects. After revoking, any stored
# https://storage.googleapis.com/... URLs in the Firestore `audios` collection
# stop working; regenerate narration through the authenticated flow instead.
set -euo pipefail
BUCKET="${1:?bucket required, e.g. gs://my-project.appspot.com}"
MODE="${2:-report}"
REPORT="public-audio-report-$(date -u +%Y%m%dT%H%M%SZ).txt"
echo "Scanning ${BUCKET}/audio/ for objects readable by allUsers..." | tee "$REPORT"
count=0
while IFS= read -r obj; do
  [[ -z "$obj" ]] && continue
  if gcloud storage objects describe "$obj" --format=json 2>/dev/null | grep -q '"entity": "allUsers"'; then
    count=$((count+1))
    echo "PUBLIC  $obj" | tee -a "$REPORT"
    if [[ "$MODE" == "--revoke" ]]; then
      gcloud storage objects update "$obj" --remove-acl-grant=allUsers >/dev/null
      echo "REVOKED $obj" | tee -a "$REPORT"
    fi
  fi
done < <(gcloud storage ls --recursive "${BUCKET}/audio/**" 2>/dev/null || true)
echo "Public objects found: $count" | tee -a "$REPORT"
echo "Also check: uniform bucket-level access (recommended ON) and any bucket-level allUsers IAM binding:" | tee -a "$REPORT"
echo "  gcloud storage buckets describe ${BUCKET} --format='value(uniform_bucket_level_access)'" | tee -a "$REPORT"
echo "  gcloud storage buckets get-iam-policy ${BUCKET}" | tee -a "$REPORT"
