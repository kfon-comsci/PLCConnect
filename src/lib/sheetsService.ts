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
        cachedAccessToken = credential.accessToken;
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
            cachedAccessToken = token;
            
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
    cachedAccessToken = token;
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
  cachedAccessToken = null;
};

export const getCachedToken = (): string | null => cachedAccessToken;
export const setCachedToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Target Drive Folder ID & Spreadsheet ID requested by User
export const TARGET_DRIVE_FOLDER_ID = '1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL';
export const TARGET_SPREADSHEET_ID = '14HIQBJxAjXCzCl1IU8UuSxEVIVL0VKtQKffXK_GqwPg';

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

export async function readSheet(
  token: string,
  spreadsheetId: string,
  sheetName: string
): Promise<any[][] | null> {
  const readRange = encodeURIComponent(`${sheetName}!A1:Z10000`);
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${readRange}`;
  const res = await fetch(readUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    console.error(`Failed to read sheet ${sheetName}:`, await res.text());
    return null;
  }
  const data = await res.json();
  return data.values || [];
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
  if (values.length <= 1) return [];
  const dataRows = values.slice(1);
  return dataRows.map(row => ({
    email: row[0] || '',
    role: (row[1] || 'Recorder') as UserRole,
    name: row[2] || '',
    password: row[3] || '',
    assignedGrade: row[4] ? row[4] as any : undefined,
    assignedClassroom: row[5] || undefined
  }));
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
  if (values.length <= 1) return [];
  return values.slice(1).map(row => ({
    id: row[0] || '',
    academicYear: parseInt(row[1] || '2569') || 2569,
    semester: (parseInt(row[2] || '1') || 1) as 1 | 2,
    gradeLevel: row[3] as any || 'ม.1',
    theme: row[4] || '',
    competencies: row[5] ? JSON.parse(row[5]) : { thai:'', math:'', science:'', technology:'', social:'', english:'', chinese:'', career:'', health:'', art:'', guidance:'' },
    committees: row[6] ? JSON.parse(row[6]) : []
  }));
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
  if (values.length <= 1) return [];
  return values.slice(1).map(row => ({
    id: row[0] || '',
    gradeLevel: row[1] as any || 'ม.1',
    semester: (parseInt(row[2] || '1') || 1) as 1 | 2,
    academicYear: parseInt(row[3] || '2569') || 2569,
    groupName: row[4] || '',
    times: parseInt(row[5] || '1') || 1,
    date: row[6] || '',
    location: row[7] || '',
    durationHours: parseInt(row[8] || '1') || 0,
    durationMinutes: parseInt(row[9] || '0') || 0,
    plcLeader: row[10] || '',
    expertRole1: row[11] || '',
    expertRole2: row[12] || '',
    expertRole3: row[13] || '',
    expertRole4: row[14] || '',
    otherParticipants: row[15] || '',
    procedures: row[16] || '',
    results: row[17] || '',
    suggestions: row[18] || '',
    images: row[19] ? JSON.parse(row[19]) : [],
    recorderName: row[20] || '',
    certifiedName: row[21] || '',
    signatures: row[22] ? JSON.parse(row[22]) : {}
  }));
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
  if (values.length <= 1) return [];
  return values.slice(1).map(row => ({
    id: row[0] || '',
    masterId: row[1] || '',
    classroomName: row[2] || '',
    innovationName: row[3] || '',
    memberCount: parseInt(row[4] || '0') || 0,
    committees: row[5] ? JSON.parse(row[5]) : { president:'', vicePresident:'', publicRelations:'', treasurer:'', secretary:'' },
    briefDetails: row[6] || '',
    goals: row[7] || '',
    expectedBenefits: row[8] || '',
    competencies: row[9] ? JSON.parse(row[9]) : { thai:'', math:'', science:'', technology:'', social:'', english:'', chinese:'', career:'', health:'', art:'', guidance:'' },
    reporterName: row[10] || '',
    classroomPresident: row[11] || '',
    files: row[12] ? JSON.parse(row[12]) : {},
    signatures: row[13] ? JSON.parse(row[13]) : {}
  }));
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
