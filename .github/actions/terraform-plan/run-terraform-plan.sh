#!/bin/bash
# Purpose: Runs terraform plan and captures output for PR comments
# Inputs: Passed via environment variables
#   SUBSCRIPTION_ID, SQL_ADMIN_PASSWORD, LLM_API_KEY (optional)
# Outputs:
#   plan_output: Raw terraform plan output

set -eo pipefail

terraform plan -no-color -input=false -out=tfplan \
  -var="subscription_id=${SUBSCRIPTION_ID}" \
  -var="sql_admin_password=${SQL_ADMIN_PASSWORD}" \
  -var="llm_api_key=${LLM_API_KEY:-}" \
  2>&1 | tee plan_output.raw.txt

PLAN_EXIT_CODE=$?

# Scrub sensitive data from plan output
echo "Scrubbing sensitive fields from plan output..."
sed -E \
  -e 's/([a-zA-Z0-9_-]*password[a-zA-Z0-9_-]*\s*=\s*)"[^"]+"/\1"(sensitive value)"/gi' \
  -e 's/([a-zA-Z0-9_-]*secret[a-zA-Z0-9_-]*\s*=\s*)"[^"]+"/\1"(sensitive value)"/gi' \
  -e 's/([a-zA-Z0-9_-]*token[a-zA-Z0-9_-]*\s*=\s*)"[^"]+"/\1"(sensitive value)"/gi' \
  -e 's/([a-zA-Z0-9_-]*key[a-zA-Z0-9_-]*\s*=\s*)"[^"]+"/\1"(sensitive value)"/gi' \
  plan_output.raw.txt > plan_output.txt

rm -f plan_output.raw.txt

# Capture plan output to GITHUB_OUTPUT
echo "plan_output<<EOF" >> "$GITHUB_OUTPUT"
cat plan_output.txt >> "$GITHUB_OUTPUT"
echo "EOF" >> "$GITHUB_OUTPUT"

if [ $PLAN_EXIT_CODE -ne 0 ]; then
  echo "::error::Terraform plan failed with exit code $PLAN_EXIT_CODE"

  if grep -q "state blob is already locked" plan_output.txt; then
    LOCK_ID=$(grep "ID:" plan_output.txt | awk '{print $2}' | head -n1)
    echo "::error::State lock detected - a previous operation may not have completed"
    echo "::notice::Lock ID: $LOCK_ID"
    echo "::notice::To unlock: terraform force-unlock $LOCK_ID"
  fi
fi

exit $PLAN_EXIT_CODE
