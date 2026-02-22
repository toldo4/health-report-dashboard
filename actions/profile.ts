"use server"

import { revalidatePath } from "next/cache";

const ENV_DOMAIN = process.env.SELFDECODE_ENV_DOMAIN || "";
const BASE_URL = `https://${ENV_DOMAIN}selfdecode.com`;
const CLIENT_ID = process.env.SELFDECODE_CLIENT_ID;
const CLIENT_SECRET = process.env.SELFDECODE_CLIENT_SECRET;

async function getAccessToken() {
  const authUrl = `${BASE_URL}/service/health-analysis/accounts/user/openid/token/`;
  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to get access token");
  const data = await response.json();
  return data.access_token;
}

// Fetch all profiles
export async function getProfiles() {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/service/b2b-integrations/profile/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to fetch profiles");
  return response.json();
}

// Fetch a single profile by ID
export async function getProfile(id: string) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/service/b2b-integrations/profile/${id}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Failed to fetch profile: ${response.status}`);
  return response.json();
}

// Create a new profile
export async function createProfile(data: any) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/service/b2b-integrations/profile/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create profile: ${errText}`);
  }
  revalidatePath("/");
  return response.json();
}

// Update an existing profile
export async function updateProfile(id: string, data: any) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/service/b2b-integrations/profile/${id}/`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update profile: ${errText}`);
  }
  revalidatePath("/");
  return response.json();
}

// Delete a profile
export async function deleteProfile(id: string) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/service/b2b-integrations/profile/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to delete profile: ${errText}`);
  }
  revalidatePath("/");
  return true;
}