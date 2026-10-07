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
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Plot = {
  id: string;
  farmerId: string;
  name: string;
  areaRai: number;
  provinceId: number;
  districtId: number;
  subdistrictId: number;
  previewUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  polygon: number[][];
};

/** Lean plot row from GET /me/plots (no GeoJSON). */
export type PlotCard = {
  id: string;
  farmerId: string;
  name: string;
  areaRai: number;
  provinceId: number;
  districtId: number;
  subdistrictId: number;
  previewUrl?: string | null;
  hasBoundary: boolean;
  ownerName?: string;
  createdAt?: string;
  updatedAt?: string;
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

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (ตรวจว่า API รันที่ :8080)", 0);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== "/auth/login/phone" &&
      path !== "/auth/register"
    ) {
      clearSession();
    }
    const message =
      typeof body?.error === "string"
        ? body.error
        : response.status >= 500
          ? "เซิร์ฟเวอร์มีปัญหา (มักเพราะ API :8080 ยังไม่รัน)"
          : "เกิดข้อผิดพลาด";
    throw new ApiError(message, response.status);
  }
  return body as T;
}

function toSession(data: FarmerSession): FarmerSession {
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

export async function loginByPhone(tel: string) {
  const data = await apiRequest<FarmerSession>("/auth/login/phone", {
    method: "POST",
    body: JSON.stringify({ tel }),
  });
  return toSession(data);
}

export type FarmerRegisterInput = {
  firstName: string;
  lastName: string;
  tel: string;
  address: string;
  provinceId: number;
  districtId: number;
  subdistrictId: number;
};

/** Self-register then receive the same session shape as phone login. */
export async function registerFarmer(input: FarmerRegisterInput) {
  const data = await apiRequest<FarmerSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toSession(data);
}

export async function listMyPlots(farmerId: string) {
  const data = await apiRequest<{ items: Plot[] }>(`/plots?farmerId=${encodeURIComponent(farmerId)}&page=1&pageSize=100`);
  return data.items ?? [];
}

export async function listGroupPlots(groupId: string) {
  const data = await apiRequest<{ items: Plot[] }>(`/plots?groupId=${encodeURIComponent(groupId)}&page=1&pageSize=100`);
  return data.items ?? [];
}

export async function listGroupFarmers(groupId: string) {
  const data = await apiRequest<{ items: Farmer[] }>(
    `/farmers?groupId=${encodeURIComponent(groupId)}&page=1&pageSize=100`,
  );
  return data.items ?? [];
}

/** Fast farmer-app plot list (no boundary GeoJSON). scope: mine | group */
export async function getMyPlots(scope: "mine" | "group" = "mine") {
  const data = await apiRequest<{ items: PlotCard[]; scope: string }>(
    `/me/plots?scope=${encodeURIComponent(scope)}`,
  );
  return data.items ?? [];
}

export async function getPlot(id: string) {
  return apiRequest<Plot>(`/plots/${encodeURIComponent(id)}`);
}

export type PlotCreateInput = {
  farmerId: string;
  name: string;
  areaRai: number;
  provinceId: number;
  districtId: number;
  subdistrictId: number;
};

export async function createPlot(input: PlotCreateInput) {
  return apiRequest<Plot>("/plots", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function farmerDisplayName(farmer: Pick<Farmer, "firstName" | "lastName">) {
  return `${farmer.firstName} ${farmer.lastName}`.trim() || "—";
}

export function formatAreaRai(totalRai: number): string {
  if (!totalRai || totalRai <= 0) return "-";
  let fullRai = Math.floor(totalRai);
  let ngan = Math.round((totalRai - fullRai) * 4);
  if (ngan === 4) {
    fullRai += 1;
    ngan = 0;
  }
  return `${fullRai} ไร่${ngan > 0 ? ` ${ngan} งาน` : ""}`;
}

export async function getFarmer(id: string) {
  return apiRequest<Farmer>(`/farmers/${id}`);
}

export type FarmerUpdateInput = {
  firstName: string;
  lastName: string;
  tel: string;
  address: string;
  provinceId: number;
  districtId: number;
  subdistrictId: number;
  groupId: string | null;
};

export async function updateFarmer(id: string, input: FarmerUpdateInput) {
  return apiRequest<Farmer>(`/farmers/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function setFarmerAvatar(id: string, avatarUrl: string) {
  return apiRequest<Farmer>(`/farmers/${id}/avatar`, {
    method: "PUT",
    body: JSON.stringify({ avatarUrl }),
  });
}

/** Upload a pre-compressed avatar via Next.js → Supabase Storage, then save URL. */
export async function uploadFarmerAvatar(farmerId: string, file: Blob) {
  if (!accessToken) throw new ApiError("ต้องเข้าสู่ระบบก่อน", 401);
  const form = new FormData();
  form.append("farmerId", farmerId);
  form.append("file", file, "profile.webp");

  let response: Response;
  try {
    response = await fetch("/api/avatar", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
  } catch {
    throw new ApiError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้", 0);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      typeof body?.error === "string" ? body.error : "อัปโหลดรูปไม่สำเร็จ",
      response.status,
    );
  }
  return body as Farmer;
}

export async function getGroup(id: string) {
  return apiRequest<{ id: string; name: string; leaderId: string }>(`/groups/${id}`);
}

export type PlantingPlanStatus = {
  id: number;
  code: string;
  name: string;
};

export type PlantingPlanItem = {
  key: string;
  type: string;
  title: string;
  statusId: number;
  date: string;
  dateKind: "actual" | "planned" | string;
  plotId: string;
  plotName: string;
  plantingId: string;
  varietyName: string;
  note?: string;
};

export type PlantingPlan = {
  items: PlantingPlanItem[];
  statuses: PlantingPlanStatus[];
  pendingCount: number;
};

export async function getMyPlantingPlan(opts?: { plotId?: string; farmerId?: string }) {
  const params = new URLSearchParams();
  if (opts?.plotId) params.set("plotId", opts.plotId);
  if (opts?.farmerId) params.set("farmerId", opts.farmerId);
  const qs = params.toString();
  return apiRequest<PlantingPlan>(`/me/planting-plan${qs ? `?${qs}` : ""}`);
}

export function formatThaiDate(value: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
