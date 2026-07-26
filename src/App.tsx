import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SuccessModal } from './components/SuccessModal';
import { PasswordModal } from './components/PasswordModal';
import { System1Master } from './components/System1Master';
import { System2PLC } from './components/System2PLC';
import { System3Classroom } from './components/System3Classroom';
import { System4Reports } from './components/System4Reports';
import { System5Admin } from './components/System5Admin';
import { RelatedDocs } from './components/RelatedDocs';
import { LoginPage } from './components/LoginPage';

import { MasterInnovation, PLCActivity, ClassroomInnovation, AdminSettings, AppUser, UserRole } from './types';
import {
  initialAdminSettings,
  defaultUsers,
  initialMasterInnovations,
  initialPLCActivities,
  initialClassroomInnovations
} from './data/initialData';

import { Layers, FileText, LayoutDashboard, Settings2, Users, FolderCheck } from 'lucide-react';

import {
  initAuthListener,
  googleSignIn,
  googleSignOut,
  findOrCreateDatabaseSpreadsheet,
  ensureRequiredSheetsExist,
  readSheet,
  syncUsers,
  mapUsers,
  syncMasterInnovations,
  mapMasterInnovations,
  syncPLCActivities,
  mapPLCActivities,
  syncClassroomInnovations,
  mapClassroomInnovations,
  syncAdminSettings,
  mapAdminSettings,
  getCachedToken,
  setCachedToken,
  TARGET_SPREADSHEET_ID
} from './lib/sheetsService';

export default function App() {
  // --- Local Persistence & State Setup ---
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const saved = localStorage.getItem('plc_connect_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallthrough
      }
    }
    return {
      email: 'admin1',
      role: 'Admin',
      name: 'Admin',
      password: ''
    };
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('plc_connect_is_logged_in') === 'true';
  });

  const [usersList, setUsersList] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('plc_connect_users_list');
    if (saved) {
      try {
        const parsed: AppUser[] = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      } catch {
        // Fallthrough
      }
    }
    return [];
  });

  const [masterInnovations, setMasterInnovations] = useState<MasterInnovation[]>(() => {
    const saved = localStorage.getItem('plc_connect_masters');
    return saved ? JSON.parse(saved) : [];
  });

  const [plcActivities, setPlcActivities] = useState<PLCActivity[]>(() => {
    const saved = localStorage.getItem('plc_connect_activities');
    return saved ? JSON.parse(saved) : [];
  });

  const [classroomInnovations, setClassroomInnovations] = useState<ClassroomInnovation[]>(() => {
    const saved = localStorage.getItem('plc_connect_classrooms');
    return saved ? JSON.parse(saved) : [];
  });

  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => {
    const saved = localStorage.getItem('plc_connect_admin_settings');
    return saved ? JSON.parse(saved) : initialAdminSettings;
  });

  // --- Google Sheets Sync States ---
  const [sheetsUser, setSheetsUser] = useState<any>(() => {
    const saved = localStorage.getItem('plc_connect_sheets_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [sheetsToken, setSheetsToken] = useState<string | null>(null); // Kept safely in-memory only
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return TARGET_SPREADSHEET_ID;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(() => {
    return localStorage.getItem('plc_connect_last_synced') || null;
  });

  // Google OAuth Restore Session & Auto Pull
  useEffect(() => {
    localStorage.setItem('plc_connect_spreadsheet_id', TARGET_SPREADSHEET_ID);
    const unsubscribe = initAuthListener(
      async (user, token) => {
        setSheetsUser(user);
        setSheetsToken(token);
        localStorage.setItem('plc_connect_sheets_user', JSON.stringify(user));
        
        // Auto background pull from exact Google Sheet ID
        try {
          await pullDataFromSheets(token, TARGET_SPREADSHEET_ID);
        } catch (e) {
          console.error("Auto-pull on session restore failed:", e);
        }
      },
      () => {
        setSheetsUser(null);
        setSheetsToken(null);
        localStorage.removeItem('plc_connect_sheets_user');
      }
    );
    return () => unsubscribe();
  }, []);

  const pushDataToSheets = async (
    token: string,
    sId: string,
    currentUsers = usersList,
    currentMasters = masterInnovations,
    currentPlc = plcActivities,
    currentClassrooms = classroomInnovations,
    currentSettings = adminSettings
  ) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await ensureRequiredSheetsExist(token, sId);
      await syncUsers(token, sId, currentUsers);
      await syncMasterInnovations(token, sId, currentMasters);
      await syncPLCActivities(token, sId, currentPlc);
      await syncClassroomInnovations(token, sId, currentClassrooms);
      await syncAdminSettings(token, sId, currentSettings);
      
      const now = new Date().toLocaleTimeString();
      setLastSynced(now);
      localStorage.setItem('plc_connect_last_synced', now);
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'ซิงค์ข้อมูลขึ้น Google Sheets ล้มเหลว');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const pullDataFromSheets = async (token: string, sId: string, _isInitialConnect = false) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await ensureRequiredSheetsExist(token, sId);
      const usersData = await readSheet(token, sId, 'Users');
      const mastersData = await readSheet(token, sId, 'MasterInnovations');
      const plcData = await readSheet(token, sId, 'PLCActivities');
      const classroomsData = await readSheet(token, sId, 'ClassroomInnovations');
      const adminData = await readSheet(token, sId, 'AdminSettings');

      if (usersData && usersData.length > 1) {
        setUsersList(mapUsers(usersData));
      } else {
        setUsersList([]);
      }

      if (mastersData && mastersData.length > 1) {
        setMasterInnovations(mapMasterInnovations(mastersData));
      } else {
        setMasterInnovations([]);
      }

      if (plcData && plcData.length > 1) {
        setPlcActivities(mapPLCActivities(plcData));
      } else {
        setPlcActivities([]);
      }

      if (classroomsData && classroomsData.length > 1) {
        setClassroomInnovations(mapClassroomInnovations(classroomsData));
      } else {
        setClassroomInnovations([]);
      }

      if (adminData && adminData.length > 1) {
        setAdminSettings(mapAdminSettings(adminData));
      } else {
        setAdminSettings(initialAdminSettings);
      }

      const now = new Date().toLocaleTimeString();
      setLastSynced(now);
      localStorage.setItem('plc_connect_last_synced', now);
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'ดึงข้อมูลจาก Google Sheets ล้มเหลว');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectSheets = async (customId?: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setSheetsUser(res.user);
        setSheetsToken(res.accessToken);
        localStorage.setItem('plc_connect_sheets_user', JSON.stringify(res.user));
        
        let sId = customId?.trim() || spreadsheetId || TARGET_SPREADSHEET_ID;
        
        setSpreadsheetId(sId);
        localStorage.setItem('plc_connect_spreadsheet_id', sId);
        
        // Populate or sync directly from Sheets
        await pullDataFromSheets(res.accessToken, sId, true);
        handleShowSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'เชื่อมต่อล้มเหลว');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectSheets = async () => {
    if (!confirm('ต้องการยกเลิกการเชื่อมต่อกับ Google Sheets ใช่หรือไม่? (ข้อมูลเดิมในชีตจะยังถูกคงไว้)')) return;
    setIsSyncing(true);
    try {
      await googleSignOut();
      setSheetsUser(null);
      setSheetsToken(null);
      setSpreadsheetId(TARGET_SPREADSHEET_ID);
      setLastSynced(null);
      localStorage.removeItem('plc_connect_spreadsheet_id');
      localStorage.removeItem('plc_connect_last_synced');
      localStorage.removeItem('plc_connect_sheets_user');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForcePull = async () => {
    let { token, sid } = getActiveSyncParams();
    if (!token) {
      await handleConnectSheets();
    } else {
      try {
        await pullDataFromSheets(token, sid);
        handleShowSuccess();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleForcePush = async () => {
    let { token, sid } = getActiveSyncParams();
    if (!token) {
      await handleConnectSheets();
    } else {
      try {
        await pushDataToSheets(token, sid);
        handleShowSuccess();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const [activeTab, setActiveTab] = useState<'1' | '2' | '3' | '4' | '5' | '6'>('4');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingUserToSwitch, setPendingUserToSwitch] = useState<AppUser | null>(null);

  // Sync to local storage on edits
  useEffect(() => {
    localStorage.setItem('plc_connect_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('plc_connect_users_list', JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    localStorage.setItem('plc_connect_masters', JSON.stringify(masterInnovations));
  }, [masterInnovations]);

  useEffect(() => {
    localStorage.setItem('plc_connect_activities', JSON.stringify(plcActivities));
  }, [plcActivities]);

  useEffect(() => {
    localStorage.setItem('plc_connect_classrooms', JSON.stringify(classroomInnovations));
  }, [classroomInnovations]);

  useEffect(() => {
    localStorage.setItem('plc_connect_admin_settings', JSON.stringify(adminSettings));
  }, [adminSettings]);

  // Ensure Recorder and Executive roles cannot remain on restricted tabs
  useEffect(() => {
    if (currentUser.role === 'Recorder' && (activeTab === '1' || activeTab === '2' || activeTab === '5' || activeTab === '6')) {
      setActiveTab('3');
    }
    if (currentUser.role === 'Executive' && (activeTab === '1' || activeTab === '2' || activeTab === '3' || activeTab === '6')) {
      setActiveTab('4');
    }
  }, [currentUser.role, activeTab]);

  // Handle active user change - trigger password verification
  const handleUserSelect = (user: AppUser) => {
    if (user.email === currentUser.email) return;
    setPendingUserToSwitch(user);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordVerified = (user: AppUser) => {
    setCurrentUser(user);
    setPendingUserToSwitch(null);
    if (user.role === 'Admin') {
      setActiveTab('5');
    } else if (user.role === 'Recorder') {
      setActiveTab('3');
    }
  };

  // --- Handlers for State updates from child components ---
  const getActiveSyncParams = () => {
    const token = sheetsToken || getCachedToken();
    const sid = spreadsheetId || localStorage.getItem('plc_connect_spreadsheet_id') || TARGET_SPREADSHEET_ID;
    return { token, sid };
  };

  const performSync = async <T,>(
    syncFn: (token: string, sid: string, data: T) => Promise<void>,
    data: T
  ) => {
    let { token, sid } = getActiveSyncParams();
    if (!token) {
      try {
        const authRes = await googleSignIn();
        if (authRes?.accessToken) {
          token = authRes.accessToken;
          setSheetsToken(token);
          setCachedToken(token);
        }
      } catch (e) {
        console.warn('Auto Google Sign-in for sync failed or cancelled:', e);
      }
    }
    if (token && sid) {
      try {
        await syncFn(token, sid, data);
        const now = new Date().toLocaleTimeString();
        setLastSynced(now);
        localStorage.setItem('plc_connect_last_synced', now);
        setSyncError(null);
      } catch (err: any) {
        console.error('Sync failed:', err);
        setSyncError(err?.message || 'ซิงค์ข้อมูล Google Sheets ไม่สำเร็จ');
      }
    } else {
      setSyncError('ยังไม่ได้ยืนยันสิทธิ์เข้าสู่ระบบ Google เพื่อซิงค์ลง Google Sheets (กรุณากด "เข้าสู่ระบบ Google")');
    }
  };

  const handleSaveMaster = (record: MasterInnovation) => {
    setMasterInnovations(prev => {
      const idx = prev.findIndex(m => m.id === record.id || m.gradeLevel === record.gradeLevel);
      let nextState;
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        nextState = copy;
      } else {
        nextState = [...prev, record];
      }
      queueMicrotask(() => {
        performSync(syncMasterInnovations, nextState);
      });
      return nextState;
    });
  };

  const handleSavePLC = (record: PLCActivity) => {
    setPlcActivities(prev => {
      const idx = prev.findIndex(p => p.id === record.id);
      let nextState;
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        nextState = copy;
      } else {
        nextState = [record, ...prev]; // Put newest first
      }
      queueMicrotask(() => {
        performSync(syncPLCActivities, nextState);
      });
      return nextState;
    });
  };

  const handleDeletePLC = (id: string) => {
    setPlcActivities(prev => {
      const nextState = prev.filter(p => p.id !== id);
      queueMicrotask(() => {
        performSync(syncPLCActivities, nextState);
      });
      return nextState;
    });
  };

  const handleSaveClassroom = (record: ClassroomInnovation) => {
    setClassroomInnovations(prev => {
      const idx = prev.findIndex(c => c.id === record.id || c.classroomName === record.classroomName);
      let nextState;
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        nextState = copy;
      } else {
        nextState = [...prev, record];
      }
      queueMicrotask(() => {
        performSync(syncClassroomInnovations, nextState);
      });
      return nextState;
    });
  };

  const handleDeleteClassroom = (id: string) => {
    setClassroomInnovations(prev => {
      const nextState = prev.filter(c => c.id !== id);
      queueMicrotask(() => {
        performSync(syncClassroomInnovations, nextState);
      });
      return nextState;
    });
  };

  const handleSaveUsersList = (newUsers: AppUser[]) => {
    setUsersList(newUsers);
    performSync(syncUsers, newUsers);
  };

  const handleSaveAdminSettings = (newSettings: AdminSettings) => {
    setAdminSettings(newSettings);
    performSync(syncAdminSettings, newSettings);
  };

  // Triggering the success popup without wiping values
  const handleLogout = () => {
    const guest: AppUser = {
      email: 'guest@bms.ac.th',
      role: 'Viewer' as any,
      name: 'ผู้เยี่ยมชม (Guest)',
      password: ''
    };
    setCurrentUser(guest);
    setIsLoggedIn(false);
    localStorage.setItem('plc_connect_is_logged_in', 'false');
    localStorage.setItem('plc_connect_current_user', JSON.stringify(guest));
    setActiveTab('4');
  };

  const handleShowSuccess = () => {
    setIsSuccessModalOpen(true);
  };

  if (!isLoggedIn) {
    return (
      <LoginPage
        usersList={usersList}
        isSyncing={isSyncing}
        onConnectSheets={handleConnectSheets}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLoggedIn(true);
          localStorage.setItem('plc_connect_is_logged_in', 'true');
          localStorage.setItem('plc_connect_current_user', JSON.stringify(user));
          if (user.role === 'Admin') {
            setActiveTab('5');
          } else if (user.role === 'Recorder') {
            setActiveTab('3');
          } else {
            setActiveTab('4');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F4F7] text-gray-900 font-sans flex flex-col selection:bg-[#E13A9D]/25 selection:text-gray-950">
      
      {/* Platform Header */}
      <Header
        currentUser={currentUser}
        spreadsheetId={spreadsheetId}
        lastSynced={lastSynced}
        onLogout={handleLogout}
      />

      {/* Main Tabbed Navigation Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-6">
        
        {/* Navigation Menu (Redesigned with beautiful visual graphics, distinct theme colors & stacked layouts) */}
        <nav className="bg-white rounded-[24px] p-5 shadow-md border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
          
          {/* 1. รายงานและพิมพ์เอกสาร */}
          <button
            id="nav-tab-4"
            type="button"
            onClick={() => setActiveTab('4')}
            className={`group relative overflow-hidden px-4 py-6 rounded-[24px] transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 border-2 min-h-[140px] ${
              activeTab === '4'
                ? 'bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] border-transparent text-white shadow-lg shadow-purple-500/20 scale-[1.02]'
                : 'bg-purple-50/40 border-purple-100/50 text-purple-700 hover:bg-purple-50 hover:border-purple-300'
            }`}
          >
            {/* Visual Graphic Element */}
            <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full transition-transform duration-500 group-hover:scale-125 opacity-30 blur-md pointer-events-none ${
              activeTab === '4' ? 'bg-white/20' : 'bg-purple-200/40'
            }`} />
            <div className={`absolute right-4 top-3 w-2.5 h-2.5 rounded-full pointer-events-none ${
              activeTab === '4' ? 'bg-white/60 animate-ping' : 'bg-transparent'
            }`} />

            <div className="flex flex-col items-center gap-3 overflow-visible z-10 w-full min-w-0">
              <LayoutDashboard className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 text-current" />
              <div className="flex flex-col items-center min-w-0">
                <span className="text-[14px] font-black leading-tight break-words">รายงานและพิมพ์เอกสาร</span>
                <span className={`text-[11px] font-bold leading-tight mt-1 ${
                  activeTab === '4' ? 'text-white/80' : 'text-purple-600/75'
                }`}>
                  สรุปผลงานนวัตกรรมและจัดพิมพ์ วช.13
                </span>
              </div>
            </div>
          </button>

          {/* 2. นวัตกรรมสายชั้น */}
          <button
            id="nav-tab-1"
            type="button"
            disabled={currentUser.role === 'Recorder' || currentUser.role === 'Executive'}
            onClick={() => {
              if (currentUser.role === 'Recorder') {
                alert('ผู้ใช้งานระดับ Recorder ไม่สามารถเข้าใช้งานเมนูนวัตกรรมสายชั้นได้');
                return;
              }
              if (currentUser.role === 'Executive') {
                alert('ผู้ใช้งานระดับ Executive ไม่สามารถเข้าใช้งานเมนูนวัตกรรมสายชั้นได้');
                return;
              }
              setActiveTab('1');
            }}
            className={`group relative overflow-hidden px-4 py-6 rounded-[24px] transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 border-2 min-h-[140px] ${
              currentUser.role === 'Recorder' || currentUser.role === 'Executive'
                ? 'bg-gray-100/80 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                : activeTab === '1'
                ? 'bg-gradient-to-br from-[#EC4899] to-[#F472B6] border-transparent text-white shadow-lg shadow-pink-500/20 scale-[1.02]'
                : 'bg-pink-50/40 border-pink-100/50 text-pink-700 hover:bg-pink-50 hover:border-pink-300'
            }`}
            title={['Recorder', 'Executive'].includes(currentUser.role) ? `ผู้ใช้งานระดับ ${currentUser.role} ไม่สามารถเข้าใช้งานเมนูนี้ได้` : undefined}
          >
            {/* Visual Graphic Element */}
            <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full transition-transform duration-500 group-hover:scale-125 opacity-30 blur-md pointer-events-none ${
              activeTab === '1' ? 'bg-white/20' : 'bg-pink-200/40'
            }`} />
            <div className={`absolute right-4 top-3 w-2.5 h-2.5 rounded-full pointer-events-none ${
              activeTab === '1' ? 'bg-white/60 animate-ping' : 'bg-transparent'
            }`} />

            <div className="flex flex-col items-center gap-3 overflow-visible z-10 w-full min-w-0">
              <Layers className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 text-current" />
              <div className="flex flex-col items-center min-w-0">
                <span className="text-[14px] font-black leading-tight break-words">นวัตกรรมสายชั้น</span>
                <span className={`text-[11px] font-bold leading-tight mt-1 ${
                  activeTab === '1' ? 'text-white/80' : 'text-pink-600/75'
                }`}>
                  จัดสรรนวัตกรรมระดับสายชั้น
                </span>
              </div>
            </div>
          </button>

          {/* 3. บันทึกกิจกรรม (วช.13) */}
          <button
            id="nav-tab-2"
            type="button"
            disabled={currentUser.role === 'Recorder' || currentUser.role === 'Executive'}
            onClick={() => {
              if (currentUser.role === 'Recorder') {
                alert('ผู้ใช้งานระดับ Recorder ไม่สามารถเข้าใช้งานเมนูบันทึกกิจกรรม PLC (วช.13) ได้');
                return;
              }
              if (currentUser.role === 'Executive') {
                alert('ผู้ใช้งานระดับ Executive ไม่สามารถเข้าใช้งานเมนูบันทึกกิจกรรม PLC (วช.13) ได้');
                return;
              }
              setActiveTab('2');
            }}
            className={`group relative overflow-hidden px-4 py-6 rounded-[24px] transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 border-2 min-h-[140px] ${
              currentUser.role === 'Recorder' || currentUser.role === 'Executive'
                ? 'bg-gray-100/80 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                : activeTab === '2'
                ? 'bg-gradient-to-br from-[#8B5CF6] to-[#C4B5FD] border-transparent text-white shadow-lg shadow-violet-500/20 scale-[1.02]'
                : 'bg-violet-50/40 border-violet-100/50 text-violet-700 hover:bg-violet-50 hover:border-violet-300'
            }`}
            title={['Recorder', 'Executive'].includes(currentUser.role) ? `ผู้ใช้งานระดับ ${currentUser.role} ไม่สามารถเข้าใช้งานเมนูนี้ได้` : undefined}
          >
            {/* Visual Graphic Element */}
            <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full transition-transform duration-500 group-hover:scale-125 opacity-30 blur-md pointer-events-none ${
              activeTab === '2' ? 'bg-white/20' : 'bg-violet-200/40'
            }`} />
            <div className={`absolute right-4 top-3 w-2.5 h-2.5 rounded-full pointer-events-none ${
              activeTab === '2' ? 'bg-white/60 animate-ping' : 'bg-transparent'
            }`} />

            <div className="flex flex-col items-center gap-3 overflow-visible z-10 w-full min-w-0">
              <FileText className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 text-current" />
              <div className="flex flex-col items-center min-w-0">
                <span className="text-[14px] font-black leading-tight break-words">บันทึกกิจกรรม (วช.13)</span>
                <span className={`text-[11px] font-bold leading-tight mt-1 ${
                  activeTab === '2' ? 'text-white/80' : 'text-violet-600/75'
                }`}>
                  สร้างกลุ่มแลกเปลี่ยนเรียนรู้ครู
                </span>
              </div>
            </div>
          </button>

          {/* 4. นวัตกรรมห้องเรียน */}
          <button
            id="nav-tab-3"
            type="button"
            disabled={currentUser.role === 'Executive'}
            onClick={() => {
              if (currentUser.role === 'Executive') {
                alert('ผู้ใช้งานระดับ Executive ไม่สามารถเข้าใช้งานเมนูนวัตกรรมห้องเรียนได้');
                return;
              }
              setActiveTab('3');
            }}
            className={`group relative overflow-hidden px-4 py-6 rounded-[24px] transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 border-2 min-h-[140px] ${
              currentUser.role === 'Executive'
                ? 'bg-gray-100/80 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                : activeTab === '3'
                ? 'bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] border-transparent text-white shadow-lg shadow-sky-500/20 scale-[1.02]'
                : 'bg-sky-50/40 border-sky-100/50 text-sky-700 hover:bg-sky-50 hover:border-sky-300'
            }`}
            title={currentUser.role === 'Executive' ? 'ผู้ใช้งานระดับ Executive ไม่สามารถเข้าใช้งานเมนูนี้ได้' : undefined}
          >
            {/* Visual Graphic Element */}
            <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full transition-transform duration-500 group-hover:scale-125 opacity-30 blur-md pointer-events-none ${
              activeTab === '3' ? 'bg-white/20' : 'bg-sky-200/40'
            }`} />
            <div className={`absolute right-4 top-3 w-2.5 h-2.5 rounded-full pointer-events-none ${
              activeTab === '3' ? 'bg-white/60 animate-ping' : 'bg-transparent'
            }`} />

            <div className="flex flex-col items-center gap-3 overflow-visible z-10 w-full min-w-0">
              <Users className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 text-current" />
              <div className="flex flex-col items-center min-w-0">
                <span className="text-[14px] font-black leading-tight break-words">นวัตกรรมห้องเรียน</span>
                <span className={`text-[11px] font-bold leading-tight mt-1 ${
                  activeTab === '3' ? 'text-white/80' : 'text-sky-600/75'
                }`}>
                  จัดทำสภานวัตกรระดับห้องเรียน
                </span>
              </div>
            </div>
          </button>

          {/* 5. เอกสารที่เกี่ยวข้อง */}
          <button
            id="nav-tab-6"
            type="button"
            disabled={currentUser.role === 'Recorder' || currentUser.role === 'Executive'}
            onClick={() => {
              if (currentUser.role === 'Recorder') {
                alert('ผู้ใช้งานระดับ Recorder ไม่สามารถเข้าใช้งานเมนูเอกสารที่เกี่ยวข้องได้');
                return;
              }
              if (currentUser.role === 'Executive') {
                alert('ผู้ใช้งานระดับ Executive ไม่สามารถเข้าใช้งานเมนูเอกสารที่เกี่ยวข้องได้');
                return;
              }
              setActiveTab('6');
            }}
            className={`group relative overflow-hidden px-4 py-6 rounded-[24px] transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 border-2 min-h-[140px] ${
              currentUser.role === 'Recorder' || currentUser.role === 'Executive'
                ? 'bg-gray-100/80 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                : activeTab === '6'
                ? 'bg-gradient-to-br from-[#0D9488] to-[#2DD4BF] border-transparent text-white shadow-lg shadow-teal-500/20 scale-[1.02]'
                : 'bg-teal-50/40 border-teal-100/50 text-teal-700 hover:bg-teal-50 hover:border-teal-300'
            }`}
            title={['Recorder', 'Executive'].includes(currentUser.role) ? `ผู้ใช้งานระดับ ${currentUser.role} ไม่สามารถเข้าใช้งานเมนูนี้ได้` : undefined}
          >
            {/* Visual Graphic Element */}
            <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full transition-transform duration-500 group-hover:scale-125 opacity-30 blur-md pointer-events-none ${
              activeTab === '6' ? 'bg-white/20' : 'bg-teal-200/40'
            }`} />
            <div className={`absolute right-4 top-3 w-2.5 h-2.5 rounded-full pointer-events-none ${
              activeTab === '6' ? 'bg-white/60 animate-ping' : 'bg-transparent'
            }`} />

            <div className="flex flex-col items-center gap-3 overflow-visible z-10 w-full min-w-0">
              <FolderCheck className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 text-current" />
              <div className="flex flex-col items-center min-w-0">
                <span className="text-[14px] font-black leading-tight break-words">เอกสารที่เกี่ยวข้อง</span>
                <span className={`text-[11px] font-bold leading-tight mt-1 ${
                  activeTab === '6' ? 'text-white/80' : 'text-teal-600/75'
                }`}>
                  จัดส่งแผนการสอนและภาพกิจกรรม
                </span>
              </div>
            </div>
          </button>

          {/* 6. ผู้ดูแลระบบ */}
          <button
            id="nav-tab-5"
            type="button"
            disabled={currentUser.role === 'Recorder'}
            onClick={() => {
              if (currentUser.role === 'Recorder') {
                alert('ผู้ใช้งานระดับ Recorder ไม่สามารถเข้าใช้งานเมนูผู้ดูแลระบบได้');
                return;
              }
              setActiveTab('5');
            }}
            className={`group relative overflow-hidden px-4 py-6 rounded-[24px] transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 border-2 min-h-[140px] ${
              currentUser.role === 'Recorder'
                ? 'bg-gray-100/80 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                : activeTab === '5'
                ? 'bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] border-transparent text-white shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'bg-amber-50/40 border-amber-100/50 text-amber-700 hover:bg-amber-50 hover:border-amber-300'
            }`}
            title={currentUser.role === 'Recorder' ? 'ผู้ใช้งานระดับ Recorder ไม่สามารถเข้าใช้งานเมนูนี้ได้' : undefined}
          >
            {/* Visual Graphic Element */}
            <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full transition-transform duration-500 group-hover:scale-125 opacity-30 blur-md pointer-events-none ${
              activeTab === '5' ? 'bg-white/20' : 'bg-amber-200/40'
            }`} />
            <div className={`absolute right-4 top-3 w-2.5 h-2.5 rounded-full pointer-events-none ${
              activeTab === '5' ? 'bg-white/60 animate-ping' : 'bg-transparent'
            }`} />

            <div className="flex flex-col items-center gap-3 overflow-visible z-10 w-full min-w-0">
              <Settings2 className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 text-current" />
              <div className="flex flex-col items-center min-w-0">
                <span className="text-[14px] font-black leading-tight break-words">ผู้ดูแลระบบ</span>
                <span className={`text-[11px] font-bold leading-tight mt-1 ${
                  activeTab === '5' ? 'text-white/80' : 'text-amber-600/75'
                }`}>
                  จัดการสิทธิ์และตั้งค่าฐานข้อมูลระบบ
                </span>
              </div>
            </div>
          </button>

        </nav>

        {/* Dynamic Panel Renderer */}
        <div className="transition-all duration-300">
          {activeTab === '1' && (
            <System1Master
              currentUser={currentUser}
              masterInnovations={masterInnovations}
              onSave={handleSaveMaster}
              onShowSuccess={handleShowSuccess}
            />
          )}

          {activeTab === '2' && (
            <System2PLC
              currentUser={currentUser}
              plcActivities={plcActivities}
              onSave={handleSavePLC}
              onDelete={handleDeletePLC}
              onShowSuccess={handleShowSuccess}
            />
          )}

          {activeTab === '3' && (
            <System3Classroom
              currentUser={currentUser}
              masterInnovations={masterInnovations}
              classroomInnovations={classroomInnovations}
              adminSettings={adminSettings}
              onSave={handleSaveClassroom}
              onShowSuccess={handleShowSuccess}
            />
          )}

          {activeTab === '4' && (
            <System4Reports
              currentUser={currentUser}
              masterInnovations={masterInnovations}
              plcActivities={plcActivities}
              classroomInnovations={classroomInnovations}
              onSaveClassroom={handleSaveClassroom}
              onDeleteClassroom={handleDeleteClassroom}
              onSavePLC={handleSavePLC}
              onShowSuccess={handleShowSuccess}
            />
          )}

          {activeTab === '5' && (
            <System5Admin
              currentUser={currentUser}
              usersList={usersList}
              adminSettings={adminSettings}
              classroomInnovations={classroomInnovations}
              plcActivities={plcActivities}
              onDeleteClassroom={handleDeleteClassroom}
              onSaveUsers={handleSaveUsersList}
              onSaveSettings={handleSaveAdminSettings}
              onShowSuccess={handleShowSuccess}
              sheetsUser={sheetsUser}
              sheetsToken={sheetsToken}
              spreadsheetId={spreadsheetId}
              isSyncing={isSyncing}
              syncError={syncError}
              lastSynced={lastSynced}
              onConnectSheets={(customId) => handleConnectSheets(customId)}
              onDisconnectSheets={handleDisconnectSheets}
              onForcePull={handleForcePull}
              onForcePush={handleForcePush}
            />
          )}

          {activeTab === '6' && (
            <RelatedDocs
              adminSettings={adminSettings}
              currentUser={currentUser}
            />
          )}
        </div>

      </main>

      {/* Footer Credentials */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12 text-center text-sm text-[#6A5077] font-semibold space-y-2">
        <p>PLC Connect &copy; {new Date().getFullYear()} — โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี.</p>
        <div className="text-xs text-gray-600 font-medium max-w-4xl mx-auto px-4 leading-relaxed space-y-1">
          <p>โปรแกรม PLC Connect V.10 นี้ถูกออกแบบและพัฒนาโดย ครูกนกรัตน์ จำเนียรสุข ครูชำนาญการพิเศษ โรงเรียนเบญจมานุสรณ์</p>
          <p>และ นายพงศธร ล้อมไธสง นักศึกษาปี 2 คณะครุศาสตร์ สาขาวิชาคอมพิวเตอร์ มหาวิทยาลัยราชภัฏรำไพพรรณี</p>
        </div>
      </footer>

      {/* Single Success Modal Overlay */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
      />

      {/* Password Verification Modal Overlay */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        targetUser={pendingUserToSwitch}
        onVerifySuccess={handlePasswordVerified}
      />

    </div>
  );
}
