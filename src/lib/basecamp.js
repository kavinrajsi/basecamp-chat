import axios from "axios";

const BASECAMP_AUTH_URL = "https://launchpad.37signals.com/authorization/new";
const BASECAMP_TOKEN_URL = "https://launchpad.37signals.com/authorization/token";
const BASECAMP_API_URL = "https://launchpad.37signals.com/authorization.json";

export function getAuthorizationUrl() {
  const params = new URLSearchParams({
    type: "web_server",
    client_id: process.env.BASECAMP_CLIENT_ID,
    redirect_uri: process.env.BASECAMP_REDIRECT_URI,
  });
  return `${BASECAMP_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    type: "web_server",
    client_id: process.env.BASECAMP_CLIENT_ID,
    client_secret: process.env.BASECAMP_CLIENT_SECRET,
    redirect_uri: process.env.BASECAMP_REDIRECT_URI,
    code,
  });
  const response = await axios.post(BASECAMP_TOKEN_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
}

export async function getAuthorization(accessToken) {
  const response = await axios.get(BASECAMP_API_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
}

export async function getProjects(accessToken, accountId) {
  const url = `https://3.basecampapi.com/${accountId}/projects.json`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function getProject(accessToken, accountId, projectId) {
  const url = `https://3.basecampapi.com/${accountId}/projects/${projectId}.json`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function getCampfire(accessToken, accountId, projectId, chatId) {
  const url = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/chats/${chatId}.json`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function getCampfireLines(accessToken, accountId, projectId, chatId) {
  const url = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/chats/${chatId}/lines.json`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function getPeople(accessToken, accountId, projectId) {
  const url = `https://3.basecampapi.com/${accountId}/projects/${projectId}/people.json`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}
