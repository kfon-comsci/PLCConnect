import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser, MasterInnovation, PLCActivity, ClassroomInnovation, AdminSettings, UserRole } from '../types';

// Initialize Firebase App for OAuth Authentication
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Request Workspace Scopes for Sheets and Drive File Management
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive');

// In-Memory Access Token caching (do not store tokens in local/session storage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Handle Google Redirect Result on App Initialization
getRedirectResult(auth)
  .then((result) => {
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedToken(credential.accessToken);
        console.log('Google Auth Redirect Success: Access Token Cached');
      }
    }
  })
  .catch((err) => {
    console.warn('Google Auth Redirect Result Error:', err);
  });

// Helper to dynamically load GIS script
function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-gsi-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

export const signInWithGis = async (): Promise<{ user: any; accessToken: string }> => {
  await loadGsiScript();
  const clientId = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string) || firebaseConfig.oAuthClientId || '731890835310-9icp9ll9q861nhgegobufrfeb27ne93f.apps.googleusercontent.com';
  
  return new Promise((resolve, reject) => {
    try {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            const token = response.access_token;
            setCachedToken(token);
            
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
              });
              const info = await res.json();
              const userObj = {
                uid: info.sub || 'google-user',
                displayName: info.name || info.email || 'Google User',
                email: info.email || '',
                photoURL: info.picture || ''
              };
              resolve({ user: userObj, accessToken: token });
            } catch {
              resolve({
                user: { uid: 'google-user', displayName: 'Google User', email: '', photoURL: '' },
                accessToken: token
              });
            }
          } else {
            reject(new Error('ไม่ได้รับ Access Token จาก Google'));
          }
        },
        onerror: (err: any) => {
          reject(err);
        }
      });
      
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
};

// 1. Authentication Manager
export const initAuthListener = (
  onSuccess: (user: User, token: string) => void,
  onFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user && cachedAccessToken) {
      onSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      onFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  if (isSigningIn) return null;
  isSigningIn = true;

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) {
      throw new Error('Could not retrieve access token from Google sign-in.');
    }
    setCachedToken(token);
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.warn('Firebase Auth Sign-In notice:', error);

    // Fallback to Google Identity Services (GIS) if Firebase Auth domain is unauthorized or popup fails
    if (
      error?.code === 'auth/unauthorized-domain' ||
      error?.code === 'auth/invalid-auth-endpoint' ||
      error?.message?.includes('unauthorized-domain') ||
      error?.message?.includes('invalid')
    ) {
      console.log('Firebase Auth handler notice. Switching to direct GIS OAuth fallback...');
      try {
        const gisResult = await signInWithGis();
        return gisResult;
      } catch (gisErr: any) {
        console.error('GIS Fallback failed:', gisErr);
        throw new Error(`ลงชื่อเข้าใช้ Google ไม่สำเร็จ: ${gisErr?.message || gisErr}`);
      }
    }

    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      console.warn('Popup blocked by browser. Attempting direct GIS flow...');
      try {
        const gisResult = await signInWithGis();
        return gisResult;
      } catch (gisErr: any) {
        console.error('GIS fallback for blocked popup failed:', gisErr);
      }
      const blockedErr = new Error('ป๊อปอัปถูกบล็อกโดยเบราว์เซอร์ (Popup Blocked) กรุณากดอนุญาตป๊อปอัป หรือเปิดแอปในหน้าต่างใหม่ (Open in New Tab)');
      (blockedErr as any).code = 'auth/popup-blocked';
      throw blockedErr;
    }
    
    // If user explicitly closed popup
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('การลงชื่อเข้าใช้ถูกยกเลิก (User closed popup)');
    }

    // Try GIS as last resort fallback for other errors
    try {
      const gisResult = await signInWithGis();
      return gisResult;
    } catch {
      throw error;
    }
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  setCachedToken(null);
};

export const getCachedToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  const stored = localStorage.getItem('plc_connect_sheets_access_token');
  if (stored) {
    cachedAccessToken = stored;
    return stored;
  }
  return null;
};

export const setCachedToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    localStorage.setItem('plc_connect_sheets_access_token', token);
  } else {
    localStorage.removeItem('plc_connect_sheets_access_token');
  }
};

// Target Drive Folder ID & Spreadsheet ID requested by User
export const TARGET_DRIVE_FOLDER_ID = '1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL';
export const TARGET_SPREADSHEET_ID = '14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg';

export async function ensureSheetTabExists(token: string, spreadsheetId: string, tabName: string): Promise<void> {
  try {
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const res = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const existingTitles = new Set((data.sheets || []).map((s: any) => s.properties?.title));
      if (!existingTitles.has(tabName)) {
        const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
        await fetch(batchUpdateUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: { title: tabName }
                }
              }
            ]
          })
        });

        // Write Header Row for the new sheet tab
        const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${tabName}'!A1:append?valueInputOption=USER_ENTERED`;
        await fetch(headerUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            majorDimension: 'ROWS',
            values: [[
              'วันเวลาที่บันทึก',
              'ระดับชั้น / กิจกรรม',
              'ผู้บันทึก / ผู้รายงาน',
              'ชื่อไฟล์ / ภาพถ่าย',
              'ชนิดไฟล์',
              'Google Drive File ID',
              'Google Drive Link',
              'Direct Image URL'
            ]]
          })
        });
      }
    }
  } catch (err) {
    console.warn(`Could not ensure sheet tab ${tabName} exists:`, err);
  }
}

export async function uploadFileToDriveAndLogToSheet(
  token: string,
  file: File,
  metadataInfo: { classroomName?: string; reporterName?: string; gradeLevel?: string; folderId?: string; spreadsheetId?: string }
): Promise<{ fileId: string; webViewLink: string; directUrl: string }> {
  const targetFolderId = metadataInfo.folderId || TARGET_DRIVE_FOLDER_ID;
  const targetSpreadsheetId = metadataInfo.spreadsheetId || TARGET_SPREADSHEET_ID;

  // 1. Prepare Google Drive Multipart upload metadata
  const fileMetadata = {
    name: file.name,
    parents: [targetFolderId]
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' })
  );
  formData.append('file', file);

  // 2. Upload file to Google Drive
  let uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }
  );

  // If upload to target folder failed (e.g. 404 or 403 folder permission issue)
  if (!uploadRes.ok) {
    const primaryErrorText = await uploadRes.text();
    console.warn(`Target folder upload failed (${primaryErrorText}). Checking fallback...`);

    // If folder not found or forbidden, throw clear explanation for folder permission setting
    if (uploadRes.status === 404 || uploadRes.status === 403 || primaryErrorText.includes('notFound') || primaryErrorText.includes('insufficientFilePermissions')) {
      throw new Error(`ไม่พบโฟลเดอร์หรือไม่มีสิทธิ์เขียนไฟล์ในโฟลเดอร์ ID: ${targetFolderId} กรุณาตั้งค่าแชร์โฟลเดอร์นี้ใน Google Drive ให้เป็น "ทุกคนที่มีลิงก์มีสิทธิ์แก้ไข (Editor)"`);
    }

    const fallbackMetadata = { name: file.name };
    const fallbackFormData = new FormData();
    fallbackFormData.append(
      'metadata',
      new Blob([JSON.stringify(fallbackMetadata)], { type: 'application/json' })
    );
    fallbackFormData.append('file', file);

    uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: fallbackFormData
      }
    );

    if (!uploadRes.ok) {
      const fallbackErrorText = await uploadRes.text();
      throw new Error(`Google Drive upload failed: ${fallbackErrorText}`);
    }
  }

  const fileData = await uploadRes.json();
  const fileId = fileData.id;
  const webViewLink = fileData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  const directUrl = file.type.startsWith('image/')
    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
    : webViewLink;

  // 3. Set file permission to reader/anyone (public viewable by link)
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn('Could not update permission for uploaded drive file:', permErr);
  }

  // 4. Log to Google Sheet ID 14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg in a dedicated "UploadLogs" sheet tab (แยกชีต ไม่ยุ่งกับ Users)
  try {
    const tabName = 'UploadLogs';
    await ensureSheetTabExists(token, targetSpreadsheetId, tabName);

    const timestamp = new Date().toLocaleString('th-TH');
    const rowValues = [
      timestamp,
      metadataInfo.classroomName || '',
      metadataInfo.reporterName || '',
      file.name,
      file.type,
      fileId,
      webViewLink,
      directUrl
    ];

    const sheetAppendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values/'${tabName}'!A1:append?valueInputOption=USER_ENTERED`;
    const appendRes = await fetch(sheetAppendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `'${tabName}'!A1`,
        majorDimension: 'ROWS',
        values: [rowValues]
      })
    });

    if (!appendRes.ok) {
      // Fallback if tab appending fails
      const fallbackUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`;
      await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          majorDimension: 'ROWS',
          values: [rowValues]
        })
      });
    }
  } catch (sheetErr) {
    console.error('Failed to log record to Google Sheet:', sheetErr);
  }

  return { fileId, webViewLink, directUrl };
}

// 2. Google Sheets Database Sync Core
// Name of the primary database spreadsheet
const SPREADSHEET_NAME = 'PLC Connect Database';

export async function findOrCreateDatabaseSpreadsheet(token: string): Promise<string> {
  // Query Drive API for an existing file
  const q = encodeURIComponent(`name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;
  
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!searchRes.ok) {
    throw new Error(`Failed to search Google Drive: ${await searchRes.text()}`);
  }
  
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }
  
  // Create a brand new spreadsheet with sheets (tabs)
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: SPREADSHEET_NAME
      },
      sheets: [
        { properties: { title: 'Users' } },
        { properties: { title: 'MasterInnovations' } },
        { properties: { title: 'PLCActivities' } },
        { properties: { title: 'ClassroomInnovations' } },
        { properties: { title: 'AdminSettings' } },
        { properties: { title: 'UploadLogs' } }
      ]
    })
  });
  
  if (!createRes.ok) {
    throw new Error(`Failed to create spreadsheet: ${await createRes.text()}`);
  }
  
  const createData = await createRes.json();
  return createData.spreadsheetId;
}

export async function ensureRequiredSheetsExist(token: string, spreadsheetId: string): Promise<void> {
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch spreadsheet metadata: ${await res.text()}`);
  }
  const data = await res.json();
  const existingTitles = new Set((data.sheets || []).map((s: any) => s.properties?.title));

  const requiredSheets = ['Users', 'MasterInnovations', 'PLCActivities', 'ClassroomInnovations', 'AdminSettings', 'UploadLogs'];
  const missingSheets = requiredSheets.filter(title => !existingTitles.has(title));

  if (missingSheets.length > 0) {
    const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const batchRes = await fetch(batchUpdateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: missingSheets.map(title => ({
          addSheet: {
            properties: { title }
          }
        }))
      })
    });
    if (!batchRes.ok) {
      throw new Error(`Failed to auto-create missing sheets: ${await batchRes.text()}`);
    }
  }
}

// Low-Level Sheet read-write utilities
export async function clearAndWriteSheet(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rows: any[][]
): Promise<void> {
  try {
    // 1. Clear existing range values up to Z10000
    const clearRange = encodeURIComponent(`${sheetName}!A1:Z10000`);
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`;
    await fetch(clearUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (clearErr) {
    console.warn(`Clear sheet range warning for ${sheetName}:`, clearErr);
  }
  
  // 2. Put fresh values (Headers + Data Rows)
  const writeRange = encodeURIComponent(`${sheetName}!A1`);
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
  const writeRes = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: `${sheetName}!A1`,
      majorDimension: 'ROWS',
      values: [headers, ...rows]
    })
  });
  
  if (!writeRes.ok) {
    const errorMsg = await writeRes.text();
    console.error(`Failed to sync ${sheetName}:`, errorMsg);
    throw new Error(`Failed to sync ${sheetName}: ${errorMsg}`);
  }
}

export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push(cell);
      cell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell);
      if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
        lines.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    lines.push(row);
  }
  return lines;
}

export function safeJsonParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    const parsed = JSON.parse(val);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getColIdx(headerRow: any[], possibleNames: string[], defaultIdx: number): number {
  if (!headerRow || !Array.isArray(headerRow)) return defaultIdx;
  const normalized = possibleNames.map(n => n.toLowerCase().trim());
  const found = headerRow.findIndex(h => h && normalized.includes(String(h).toLowerCase().trim()));
  return found !== -1 ? found : defaultIdx;
}

export async function readSheetCSV(
  spreadsheetId: string,
  sheetName: string
): Promise<any[][] | null> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const text = await res.text();
    if (text.includes('<!DOCTYPE html>') || text.includes('google-signin') || text.includes('<html')) {
      return null;
    }
    const parsed = parseCSV(text);
    return parsed.length > 0 ? parsed : null;
  } catch (e) {
    console.warn(`readSheetCSV notice for ${sheetName}:`, e);
    return null;
  }
}

export async function readSheet(
  token: string | null | undefined,
  spreadsheetId: string,
  sheetName: string
): Promise<any[][] | null> {
  if (token) {
    try {
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetName)}'`;
      const res = await fetch(readUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.values) return data.values;
      } else {
        console.warn(`OAuth readSheet for ${sheetName} returned status ${res.status}. Trying CSV fallback...`);
      }
    } catch (err) {
      console.warn(`OAuth readSheet error for ${sheetName}:`, err);
    }
  }

  // Fallback to CSV reading
  const csvData = await readSheetCSV(spreadsheetId, sheetName);
  return csvData;
}

// 3. Bidirectional Mappings for all Entities
// Users Sheet
const USERS_HEADERS = ['email', 'role', 'name', 'password', 'assignedGrade', 'assignedClassroom'];
export async function syncUsers(token: string, spreadsheetId: string, users: AppUser[]): Promise<void> {
  const rows = users.map(u => [
    u.email,
    u.role,
    u.name,
    u.password || '',
    u.assignedGrade || '',
    u.assignedClassroom || ''
  ]);
  await clearAndWriteSheet(token, spreadsheetId, 'Users', USERS_HEADERS, rows);
}
export function mapUsers(values: any[][]): AppUser[] {
  if (!values || values.length <= 1) return [];
  const headerRow = values[0] || [];
  const dataRows = values.slice(1);

  const idxEmail = getColIdx(headerRow, ['email', 'อีเมล', 'user', 'username', 'ชื่อผู้ใช้'], 0);
  const idxRole = getColIdx(headerRow, ['role', 'บทบาท', 'สิทธิ์', 'บทบาทสิทธิ์'], 1);
  const idxName = getColIdx(headerRow, ['name', 'ชื่อ', 'ชื่อ-นามสกุล', 'ชื่อสมาชิก'], 2);
  const idxPass = getColIdx(headerRow, ['password', 'รหัสผ่าน', 'pass'], 3);
  const idxGrade = getColIdx(headerRow, ['assignedgrade', 'ระดับชั้น', 'ชั้น'], 4);
  const idxClassroom = getColIdx(headerRow, ['assignedclassroom', 'ห้องเรียน', 'ห้อง'], 5);

  return dataRows
    .filter(row => row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''))
    .map(row => ({
      email: String(row[idxEmail] || '').trim(),
      role: (String(row[idxRole] || 'Recorder').trim() || 'Recorder') as UserRole,
      name: String(row[idxName] || '').trim(),
      password: String(row[idxPass] || '').trim(),
      assignedGrade: row[idxGrade] ? String(row[idxGrade]).trim() as any : undefined,
      assignedClassroom: row[idxClassroom] ? String(row[idxClassroom]).trim() : undefined
    }))
    .filter(u => u.email || u.name);
}

// MasterInnovations Sheet
const MASTER_HEADERS = ['id', 'academicYear', 'semester', 'gradeLevel', 'theme', 'competencies', 'committees'];
export async function syncMasterInnovations(token: string, spreadsheetId: string, masters: MasterInnovation[]): Promise<void> {
  const rows = masters.map(m => [
    m.id,
    m.academicYear,
    m.semester,
    m.gradeLevel,
    m.theme,
    JSON.stringify(m.competencies),
    JSON.stringify(m.committees)
  ]);
  await clearAndWriteSheet(token, spreadsheetId, 'MasterInnovations', MASTER_HEADERS, rows);
}
export function mapMasterInnovations(values: any[][]): MasterInnovation[] {
  if (!values || values.length <= 1) return [];
  const headerRow = values[0] || [];
  const dataRows = values.slice(1);

  const idxId = getColIdx(headerRow, ['id', 'รหัส'], 0);
  const idxYear = getColIdx(headerRow, ['academicyear', 'ปีการศึกษา'], 1);
  const idxSem = getColIdx(headerRow, ['semester', 'ภาคเรียน'], 2);
  const idxGrade = getColIdx(headerRow, ['gradelevel', 'ระดับชั้น'], 3);
  const idxTheme = getColIdx(headerRow, ['theme', 'หัวข้อ', 'ชื่อนวัตกรรม'], 4);
  const idxComp = getColIdx(headerRow, ['competencies', 'สมรรถนะ'], 5);
  const idxComm = getColIdx(headerRow, ['committees', 'คณะกรรมการ'], 6);

  return dataRows
    .filter(row => row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''))
    .map(row => ({
      id: String(row[idxId] || '').trim(),
      academicYear: parseInt(String(row[idxYear] || '2569')) || 2569,
      semester: (parseInt(String(row[idxSem] || '1')) || 1) as 1 | 2,
      gradeLevel: (String(row[idxGrade] || 'ม.1').trim()) as any,
      theme: String(row[idxTheme] || '').trim(),
      competencies: safeJsonParse(row[idxComp], { thai:'', math:'', science:'', technology:'', social:'', english:'', chinese:'', career:'', health:'', art:'', guidance:'' }),
      committees: safeJsonParse(row[idxComm], [])
    }))
    .filter(m => m.id || m.theme);
}

// PLCActivities Sheet
const PLC_HEADERS = [
  'id', 'gradeLevel', 'semester', 'academicYear', 'groupName', 'times', 'date', 'location',
  'durationHours', 'durationMinutes', 'plcLeader', 'expertRole1', 'expertRole2', 'expertRole3',
  'expertRole4', 'otherParticipants', 'procedures', 'results', 'suggestions', 'images',
  'recorderName', 'certifiedName', 'signatures'
];

function sanitizeLongBase64(val: string): string {
  if (val && val.startsWith('data:') && val.length > 15000) {
    return `[รูปภาพถูกย่อขนาดเพื่อประหยัดพื้นที่บน Google Sheets]`;
  }
  return val;
}

export async function syncPLCActivities(token: string, spreadsheetId: string, activities: PLCActivity[]): Promise<void> {
  const rows = activities.map(act => {
    const sanitizedImages = (act.images || []).map(img => sanitizeLongBase64(img));
    
    const sigs = act.signatures || {};
    const sanitizedSignatures = {
      recorderSig: sigs.recorderSig ? sanitizeLongBase64(sigs.recorderSig) : undefined,
      viceDirectorSig: sigs.viceDirectorSig ? sanitizeLongBase64(sigs.viceDirectorSig) : undefined,
      directorSig: sigs.directorSig ? sanitizeLongBase64(sigs.directorSig) : undefined,
    };

    return [
      act.id,
      act.gradeLevel,
      act.semester,
      act.academicYear,
      act.groupName,
      act.times,
      act.date,
      act.location,
      act.durationHours,
      act.durationMinutes,
      act.plcLeader,
      act.expertRole1,
      act.expertRole2,
      act.expertRole3,
      act.expertRole4,
      act.otherParticipants,
      act.procedures,
      act.results,
      act.suggestions,
      JSON.stringify(sanitizedImages),
      act.recorderName,
      act.certifiedName,
      JSON.stringify(sanitizedSignatures)
    ];
  });
  await clearAndWriteSheet(token, spreadsheetId, 'PLCActivities', PLC_HEADERS, rows);
}
export function mapPLCActivities(values: any[][]): PLCActivity[] {
  if (!values || values.length <= 1) return [];
  const headerRow = values[0] || [];
  const dataRows = values.slice(1);

  const idxId = getColIdx(headerRow, ['id', 'รหัส'], 0);
  const idxGrade = getColIdx(headerRow, ['gradelevel', 'ระดับชั้น'], 1);
  const idxSem = getColIdx(headerRow, ['semester', 'ภาคเรียน'], 2);
  const idxYear = getColIdx(headerRow, ['academicyear', 'ปีการศึกษา'], 3);
  const idxGroup = getColIdx(headerRow, ['groupname', 'ชื่อกลุ่ม'], 4);
  const idxTimes = getColIdx(headerRow, ['times', 'ครั้งที่'], 5);
  const idxDate = getColIdx(headerRow, ['date', 'วันที่'], 6);
  const idxLoc = getColIdx(headerRow, ['location', 'สถานที่'], 7);
  const idxDurH = getColIdx(headerRow, ['durationhours', 'ชั่วโมง'], 8);
  const idxDurM = getColIdx(headerRow, ['durationminutes', 'นาที'], 9);
  const idxLeader = getColIdx(headerRow, ['plcleader', 'ประธานกลุ่ม'], 10);
  const idxExp1 = getColIdx(headerRow, ['expertrole1', 'ผู้เชี่ยวชาญ1'], 11);
  const idxExp2 = getColIdx(headerRow, ['expertrole2', 'ผู้เชี่ยวชาญ2'], 12);
  const idxExp3 = getColIdx(headerRow, ['expertrole3', 'ผู้เชี่ยวชาญ3'], 13);
  const idxExp4 = getColIdx(headerRow, ['expertrole4', 'ผู้เชี่ยวชาญ4'], 14);
  const idxOther = getColIdx(headerRow, ['otherparticipants', 'ผู้เข้าร่วมอื่น'], 15);
  const idxProc = getColIdx(headerRow, ['procedures', 'ขั้นตอน'], 16);
  const idxRes = getColIdx(headerRow, ['results', 'ผลการดำเนินงาน'], 17);
  const idxSugg = getColIdx(headerRow, ['suggestions', 'ข้อเสนอแนะ'], 18);
  const idxImg = getColIdx(headerRow, ['images', 'รูปภาพ'], 19);
  const idxRec = getColIdx(headerRow, ['recordername', 'ผู้บันทึก'], 20);
  const idxCert = getColIdx(headerRow, ['certifiedname', 'ผู้รับรอง'], 21);
  const idxSigs = getColIdx(headerRow, ['signatures', 'ลายเซ็น'], 22);

  return dataRows
    .filter(row => row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''))
    .map(row => ({
      id: String(row[idxId] || '').trim(),
      gradeLevel: (String(row[idxGrade] || 'ม.1').trim()) as any,
      semester: (parseInt(String(row[idxSem] || '1')) || 1) as 1 | 2,
      academicYear: parseInt(String(row[idxYear] || '2569')) || 2569,
      groupName: String(row[idxGroup] || '').trim(),
      times: parseInt(String(row[idxTimes] || '1')) || 1,
      date: String(row[idxDate] || '').trim(),
      location: String(row[idxLoc] || '').trim(),
      durationHours: parseInt(String(row[idxDurH] || '0')) || 0,
      durationMinutes: parseInt(String(row[idxDurM] || '0')) || 0,
      plcLeader: String(row[idxLeader] || '').trim(),
      expertRole1: String(row[idxExp1] || '').trim(),
      expertRole2: String(row[idxExp2] || '').trim(),
      expertRole3: String(row[idxExp3] || '').trim(),
      expertRole4: String(row[idxExp4] || '').trim(),
      otherParticipants: String(row[idxOther] || '').trim(),
      procedures: String(row[idxProc] || '').trim(),
      results: String(row[idxRes] || '').trim(),
      suggestions: String(row[idxSugg] || '').trim(),
      images: safeJsonParse(row[idxImg], []),
      recorderName: String(row[idxRec] || '').trim(),
      certifiedName: String(row[idxCert] || '').trim(),
      signatures: safeJsonParse(row[idxSigs], {})
    }))
    .filter(act => act.id || act.groupName || act.procedures);
}

// ClassroomInnovations Sheet
const CLASSROOM_HEADERS = [
  'id', 'masterId', 'classroomName', 'innovationName', 'memberCount', 'committees',
  'briefDetails', 'goals', 'expectedBenefits', 'competencies', 'reporterName', 'classroomPresident', 'files', 'signatures'
];
export async function syncClassroomInnovations(token: string, spreadsheetId: string, classrooms: ClassroomInnovation[]): Promise<void> {
  const rows = classrooms.map(ci => [
    ci.id,
    ci.masterId,
    ci.classroomName,
    ci.innovationName,
    ci.memberCount,
    JSON.stringify(ci.committees),
    ci.briefDetails,
    ci.goals,
    ci.expectedBenefits,
    JSON.stringify(ci.competencies),
    ci.reporterName,
    ci.classroomPresident,
    JSON.stringify(ci.files || {}),
    JSON.stringify(ci.signatures || {})
  ]);
  await clearAndWriteSheet(token, spreadsheetId, 'ClassroomInnovations', CLASSROOM_HEADERS, rows);
}
export function mapClassroomInnovations(values: any[][]): ClassroomInnovation[] {
  if (!values || values.length <= 1) return [];
  const headerRow = values[0] || [];
  const dataRows = values.slice(1);

  const idxId = getColIdx(headerRow, ['id', 'รหัส'], 0);
  const idxMasterId = getColIdx(headerRow, ['masterid', 'รหัสหลัก'], 1);
  const idxClass = getColIdx(headerRow, ['classroomname', 'ชื่อห้องเรียน', 'ห้องเรียน'], 2);
  const idxInno = getColIdx(headerRow, ['innovationname', 'ชื่อนวัตกรรม'], 3);
  const idxCount = getColIdx(headerRow, ['membercount', 'จำนวนสมาชิก'], 4);
  const idxComm = getColIdx(headerRow, ['committees', 'คณะกรรมการ'], 5);
  const idxBrief = getColIdx(headerRow, ['briefdetails', 'รายละเอียดสังเขป'], 6);
  const idxGoals = getColIdx(headerRow, ['goals', 'เป้าหมาย'], 7);
  const idxBen = getColIdx(headerRow, ['expectedbenefits', 'ประโยชน์ที่คาดว่าจะได้รับ'], 8);
  const idxComp = getColIdx(headerRow, ['competencies', 'สมรรถนะ'], 9);
  const idxRep = getColIdx(headerRow, ['reportername', 'ผู้รายงาน'], 10);
  const idxPres = getColIdx(headerRow, ['classroompresident', 'ประธานห้องเรียน'], 11);
  const idxFiles = getColIdx(headerRow, ['files', 'ไฟล์'], 12);
  const idxSigs = getColIdx(headerRow, ['signatures', 'ลายเซ็น'], 13);

  return dataRows
    .filter(row => row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''))
    .map(row => ({
      id: String(row[idxId] || '').trim(),
      masterId: String(row[idxMasterId] || '').trim(),
      classroomName: String(row[idxClass] || '').trim(),
      innovationName: String(row[idxInno] || '').trim(),
      memberCount: parseInt(String(row[idxCount] || '0')) || 0,
      committees: safeJsonParse(row[idxComm], { president:'', vicePresident:'', publicRelations:'', treasurer:'', secretary:'' }),
      briefDetails: String(row[idxBrief] || '').trim(),
      goals: String(row[idxGoals] || '').trim(),
      expectedBenefits: String(row[idxBen] || '').trim(),
      competencies: safeJsonParse(row[idxComp], { thai:'', math:'', science:'', technology:'', social:'', english:'', chinese:'', career:'', health:'', art:'', guidance:'' }),
      reporterName: String(row[idxRep] || '').trim(),
      classroomPresident: String(row[idxPres] || '').trim(),
      files: safeJsonParse(row[idxFiles], {}),
      signatures: safeJsonParse(row[idxSigs], {})
    }))
    .filter(ci => ci.id || ci.classroomName || ci.innovationName);
}

// AdminSettings Sheet
const ADMIN_SETTINGS_HEADERS = ['key', 'value'];
export async function syncAdminSettings(token: string, spreadsheetId: string, settings: AdminSettings): Promise<void> {
  const rows = [
    ['driveLinks', JSON.stringify(settings.driveLinks || {})],
    ['googleDriveLinks', JSON.stringify(settings.googleDriveLinks || [])],
    ['gradePlans', JSON.stringify(settings.gradePlans || [])],
    ['subjectPlans', JSON.stringify(settings.subjectPlans || [])],
    ['activityPhotos', JSON.stringify(settings.activityPhotos || [])]
  ];
  await clearAndWriteSheet(token, spreadsheetId, 'AdminSettings', ADMIN_SETTINGS_HEADERS, rows);
}
export function mapAdminSettings(values: any[][]): AdminSettings {
  const settings: AdminSettings = {
    driveLinks: { flowchart: '', brochure: '', workImage: '', activityCollection: '', additionalDoc: '' },
    googleDriveLinks: [],
    gradePlans: [],
    subjectPlans: [],
    activityPhotos: []
  };
  if (values.length <= 1) return settings;
  values.slice(1).forEach(row => {
    const key = row[0];
    const value = row[1];
    if (value) {
      try {
        (settings as any)[key] = JSON.parse(value);
      } catch (e) {
        console.error(`Failed to parse AdminSettings key "${key}":`, e);
      }
    }
  });
  return settings;
}
