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
  let url = `https://3.basecampapi.com/${accountId}/projects.json`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  let all = [];
  while (url) {
    const response = await axios.get(url, { headers });
    all = all.concat(response.data);
    const link = response.headers?.link;
    const next = link?.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return all;
}

export async function getQuestion(accessToken, accountId, bucketId, questionId) {
  const url = `https://3.basecampapi.com/${accountId}/buckets/${bucketId}/questions/${questionId}.json`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  return response.data;
}

export async function getQuestionAnswers(accessToken, accountId, bucketId, questionId) {
  let url = `https://3.basecampapi.com/${accountId}/buckets/${bucketId}/questions/${questionId}/answers.json`;
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  let all = [];
  while (url) {
    const response = await axios.get(url, { headers });
    all = all.concat(response.data);
    const link = response.headers?.link;
    const next = link?.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return all;
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

export async function createCampfireLine(accessToken, accountId, projectId, chatId, content) {
  const url = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/chats/${chatId}/lines.json`;
  const response = await axios.post(
    url,
    { content },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

export async function trashRecording(accessToken, accountId, projectId, recordingId) {
  const url = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/recordings/${recordingId}/status/trashed.json`;
  await axios.put(url, {}, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

export async function getTodoLists(accessToken, accountId, projectId, todosetId) {
  const url = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todosets/${todosetId}/todolists.json`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function getTodos(accessToken, accountId, projectId, todolistId, completed = false) {
  let url = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todolists/${todolistId}/todos.json?completed=${completed}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  let all = [];
  while (url) {
    const response = await axios.get(url, { headers });
    all = all.concat(response.data);
    const link = response.headers?.link;
    const next = link?.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return all;
}

export async function getMyAssignments(accessToken, accountId, groupBy = "bucket") {
  const url = `https://3.basecampapi.com/${accountId}/my/assignments.json?group_by=${groupBy}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function getMessages(accessToken, accountId, projectId, messageBoardId) {
  const url = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function getScheduleEntries(accessToken, accountId, projectId, scheduleId) {
  const url = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/schedules/${scheduleId}/entries.json`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function getAllPeople(accessToken, accountId) {
  let url = `https://3.basecampapi.com/${accountId}/people.json`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  let all = [];
  while (url) {
    const response = await axios.get(url, { headers });
    all = all.concat(response.data);
    const link = response.headers?.link;
    const next = link?.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return all;
}

export async function getPeople(accessToken, accountId, projectId) {
  let url = `https://3.basecampapi.com/${accountId}/projects/${projectId}/people.json`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  let all = [];
  while (url) {
    const response = await axios.get(url, { headers });
    all = all.concat(response.data);
    const link = response.headers?.link;
    const next = link?.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return all;
}
