export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type Farmer = {
  id: string;
  firstName: string;
  lastName: string;
  tel: string;
  address: string;
  provinceId: number;
  districtId: number;
  subdistrictId: number;
  groupId: string | null;
  deliveredKg: number;
};

export type Plot = {
  id: string;
  farmerId: string;
  name: string;
  areaRai: number;
  provinceId: number;
  districtId: number;
  subdistrictId: number;
  polygon: number[][];
};

export type FarmerSession = {
  token: string;
  tel: string;
  displayName: string;
  role: "member" | "leader";
  farmerId: string;
  farmer: Farmer;
};

const BASE = "/api/v1";
const SESSION_KEY = "dona.farmer.session";

let accessToken = "";

export function getSession(): FarmerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FarmerSession;
  } catch {
    return null;
  }
}

export function setSession(session: FarmerSession) {
  accessToken = session.token;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  accessToken = "";
  sessionStorage.removeItem(SESSION_KEY);
}

export function restoreSession() {
  const session = getSession();
  if (!session?.token) {
    clearSession();
    return null;
  }
  accessToken = session.token;
  return session;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login/phone") clearSession();
    throw new ApiError(typeof body?.error === "string" ? body.error : "เกิดข้อผิดพลาด", response.status);
  }
  return body as T;
}

export async function loginByPhone(tel: string) {
  const data = await apiRequest<FarmerSession>("/auth/login/phone", {
    method: "POST",
    body: JSON.stringify({ tel }),
  });
  const session: FarmerSession = {
    token: data.token,
    tel: data.tel,
    displayName: data.displayName,
    role: data.role,
    farmerId: data.farmerId,
    farmer: data.farmer,
  };
  setSession(session);
  return session;
}

export async function listMyPlots(farmerId: string) {
  const data = await apiRequest<{ items: Plot[] }>(`/plots?farmerId=${encodeURIComponent(farmerId)}&page=1&pageSize=100`);
  return data.items ?? [];
}

export function apiMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้";
}

export function formatTelInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
