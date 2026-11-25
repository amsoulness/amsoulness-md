const axios = require("axios");

async function deployLatestCommit(serviceId, apiKey) {
  if (!serviceId) throw new Error("RENDER_SERVICE_ID is not set.");
  if (!apiKey) throw new Error("RENDER_API_KEY is not set.");
  try {
    const response = await axios.post(
      `https://api.render.com/v1/services/${encodeURIComponent(serviceId)}/deploys`,
      { clearCache: "clear" },
      { timeout: 30000, headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } }
    );
    if (!response.data?.id) throw new Error("Missing deployment ID");
    return { id: response.data.id, status: response.data.status };
  } catch (error) {
    // Do not include request headers or credentials in errors sent to WhatsApp.
    const status = error.response?.status;
    throw new Error(status ? `Render rejected the deployment (HTTP ${status}). Check the Render API key and service access.` : "Render did not confirm a deployment. Check its dashboard before retrying.");
  }
}
module.exports = deployLatestCommit;
