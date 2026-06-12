import httpx
from typing import Optional, List, Dict, Any
from app.models.workspace import Workspace
from app.utils.encryption import encryptor

class DialogClient:
    def __init__(self, workspace: Workspace):
        self.api_key = encryptor.decrypt(workspace.dialog_api_key)
        self.base_url = encryptor.decrypt(workspace.dialog_base_url)
        
        if not self.api_key or not self.base_url:
            raise ValueError("Dialog credentials are not configured for this workspace.")
            
        # Ensure base URL is clean
        self.base_url = self.base_url.rstrip("/")
        
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )

    async def close(self):
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    # --- CALLS ---

    async def initiate_call(
        self,
        phone: str,
        crm_contact_id: Optional[str],
        metadata: Dict[str, Any],
        transfer_rules: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        POST /api/crm/calls
        Returns: {callId, callSid, status, streamUrl}
        """
        body = {
            "phone": phone,
            "crmContactId": crm_contact_id,
            "metadata": metadata,
            "transferRules": transfer_rules
        }
        response = await self.client.post("/api/crm/calls", json=body)
        response.raise_for_status()
        return response.json()

    async def get_call(self, call_id: int) -> Dict[str, Any]:
        """
        GET /api/crm/calls/{call_id}
        """
        response = await self.client.get(f"/api/crm/calls/{call_id}")
        response.raise_for_status()
        return response.json()

    async def get_transcript(self, call_id: int) -> Dict[str, Any]:
        """
        GET /api/crm/calls/{call_id}/transcript
        """
        response = await self.client.get(f"/api/crm/calls/{call_id}/transcript")
        response.raise_for_status()
        return response.json()

    async def transfer_call(
        self,
        call_id: int,
        crm_agent_id: Optional[str],
        transfer_to: Optional[str],
        reason: str,
        transfer_type: str = "cold",
        briefing_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        POST /api/crm/calls/{call_id}/transfer
        """
        body = {
            "crmAgentId": crm_agent_id,
            "transferTo": transfer_to,
            "reason": reason,
            "transferType": transfer_type,
            "briefingMessage": briefing_message
        }
        response = await self.client.post(f"/api/crm/calls/{call_id}/transfer", json=body)
        response.raise_for_status()
        return response.json()

    async def end_call(self, call_id: int) -> Dict[str, Any]:
        """
        POST /api/crm/calls/{call_id}/end
        """
        response = await self.client.post(f"/api/crm/calls/{call_id}/end")
        response.raise_for_status()
        return response.json()

    # --- AGENTS ---

    async def list_agents(self) -> List[Dict[str, Any]]:
        """
        GET /api/crm/agents
        """
        response = await self.client.get("/api/crm/agents")
        response.raise_for_status()
        return response.json()

    async def register_or_update_agent(
        self,
        crm_agent_id: str,
        name: str,
        phone: str,
        specialization: Optional[str],
        intents: List[str],
        max_concurrent_calls: int = 3
    ) -> Dict[str, Any]:
        """
        POST /api/crm/agents
        """
        body = {
            "crmAgentId": crm_agent_id,
            "name": name,
            "phone": phone,
            "specialization": specialization,
            "intents": intents,
            "maxConcurrentCalls": max_concurrent_calls
        }
        response = await self.client.post("/api/crm/agents", json=body)
        response.raise_for_status()
        return response.json()

    async def set_agent_availability(self, agent_id: str, is_available: bool) -> Dict[str, Any]:
        """
        PATCH /api/crm/agents/{agent_id}/availability
        """
        body = {"available": is_available}
        response = await self.client.patch(f"/api/crm/agents/{agent_id}/availability", json=body)
        response.raise_for_status()
        return response.json()

    # --- WEBHOOKS ---

    async def register_webhook(self, webhook_url: str) -> Dict[str, Any]:
        """
        POST /api/crm/webhooks
        Body: {"webhookUrl": webhook_url}
        Returns: {webhookUrl, webhookSecret}
        """
        body = {"webhookUrl": webhook_url}
        response = await self.client.post("/api/crm/webhooks", json=body)
        response.raise_for_status()
        return response.json()

    async def get_webhook_deliveries(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        GET /api/crm/webhooks/deliveries?status={status}
        """
        params = {}
        if status:
            params["status"] = status
        response = await self.client.get("/api/crm/webhooks/deliveries", params=params)
        response.raise_for_status()
        return response.json()

    # --- CAMPAIGNS ---

    async def create_campaign(
        self,
        name: str,
        contacts: List[Dict[str, Any]], # [{phone, firstName, lastName?, company?}]
        start_time: str, # "09:00"
        end_time: str, # "17:00"
        timezone: str,
        max_concurrent_calls: int
    ) -> Dict[str, Any]:
        """
        POST /api/crm/campaigns
        Returns: {campaignId, status}
        """
        body = {
            "name": name,
            "contacts": contacts,
            "startTime": start_time,
            "endTime": end_time,
            "timezone": timezone,
            "maxConcurrentCalls": max_concurrent_calls
        }
        response = await self.client.post("/api/crm/campaigns", json=body)
        response.raise_for_status()
        return response.json()

    async def start_campaign(self, campaign_id: int) -> Dict[str, Any]:
        """
        POST /api/crm/campaigns/{campaign_id}/start
        """
        response = await self.client.post(f"/api/crm/campaigns/{campaign_id}/start")
        response.raise_for_status()
        return response.json()

    async def get_campaign_status(self, campaign_id: int) -> Dict[str, Any]:
        """
        GET /api/crm/campaigns/{campaign_id}/status
        Returns: {stats: {total, called, answered, interested}}
        """
        response = await self.client.get(f"/api/crm/campaigns/{campaign_id}/status")
        response.raise_for_status()
        return response.json()
