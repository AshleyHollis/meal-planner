# Session: kimi-k25 Azure AI Foundry Deployment

**Date:** 2026-03-04 10:53  
**Agents:** Parker, Ripley

## Summary

Parker updated deploy-kimi-k25.sh for existing Azure AI Foundry account, added LLM*PROVIDER=openai to K8s worker deployments, and flagged AU East vs US region discrepancy.  
Ripley added Azure OpenAI path to API's \_call_llm(), wired AZURE_OPENAI*\* env vars to K8s deployments, bumped API version, and verified worker llm_client.py compatibility.

## Decisions Made

- LLM_PROVIDER environment variable set to 'openai' for K8s workers
- Azure OpenAI integrated into API's LLM client path
- Region selection (AU East vs US) requires follow-up decision

## Artifacts

- deploy-kimi-k25.sh (updated)
- API K8s deployment specs (env vars added)
- Worker deployment specs (LLM_PROVIDER added)

## Next Steps

- Resolve region discrepancy (AU East vs US East)
- Deploy to Azure AI Foundry
- Verify worker and API LLM provider handshake
