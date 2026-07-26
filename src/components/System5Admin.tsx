import React, { useState } from 'react';
import { AppUser, AdminSettings, UserRole, GoogleDriveLink, GradePlanLink, SubjectPlanLink, ActivityPhotoLink, ClassroomInnovation, UploadedFile, PLCActivity } from '../types';
import { Users, Settings2, ShieldCheck, Plus, Trash2, Edit, Save, Globe, RefreshCcw, Lock, Key, Layers, BookOpen, Camera, FileSpreadsheet, CheckCircle2, XCircle, Database, ExternalLink, Loader2, FileText, Eye, X, Upload, Folder, Link as LinkIcon, FileImage, Copy, Check, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface System5AdminProps {
  currentUser: AppUser;
  usersList: AppUser[];
  adminSettings: AdminSettings;
  classroomInnovations?: ClassroomInnovation[];
  plcActivities?: PLCActivity[];
  onDeleteClassroom?: (id: string) => void;
  onSaveUsers: (users: AppUser[]) => void;
  onSaveSettings: (settings: AdminSettings) => void;
  onShowSuccess: () => void;

  // Google Sheets props
  sheetsUser: any;
  sheetsToken: string | null;
  spreadsheetId: string | null;
  isSyncing: boolean;
  syncError: string | null;
  lastSynced: string | null;
  onConnectSheets: (customId?: string) => Promise<void>;
  onDisconnectSheets: () => Promise<void>;
  onForcePull: () => Promise<void>;
  onForcePush: () => Promise<void>;
}

export const System5Admin: React.FC<System5AdminProps> = ({
  currentUser,
  usersList,
  adminSettings,
  classroomInnovations = [],
  plcActivities = [],
  onDeleteClassroom,
  onSaveUsers,
  onSaveSettings,
  onShowSuccess,
  sheetsUser,
  sheetsToken,
  spreadsheetId,
  isSyncing,
  syncError,
  lastSynced,
  onConnectSheets,
  onDisconnectSheets,
  onForcePull,
  onForcePush
}) => {
  // Check if active user is Admin
  const isAdmin = currentUser.role === 'Admin';

  // User management states
  const [localUsers, setLocalUsers] = useState<AppUser[]>([...usersList]);
  const [deletingUserEmail, setDeletingUserEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Recorder');
  const [newGrade, setNewGrade] = useState<'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'>('ม.1');
  const [newClass, setNewClass] = useState('');

  const handleChangePassword = (email: string, currentPass: string) => {
    const newPass = prompt(`ระบุรหัสผ่านใหม่สำหรับผู้ใช้ (${email}):`, currentPass !== undefined && currentPass !== null ? String(currentPass) : '');
    if (newPass === null) return; // cancelled
    if (newPass.trim() === '') {
      alert('รหัสผ่านต้องไม่เป็นค่าว่าง');
      return;
    }
    const updated = localUsers.map(u => u.email === email ? { ...u, password: newPass.trim() } : u);
    setLocalUsers(updated);
    onSaveUsers(updated);
    onShowSuccess();
  };

  // Inline editing state
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Recorder');
  const [editGrade, setEditGrade] = useState<'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'>('ม.1');
  const [editClass, setEditClass] = useState('');

  const handleStartEdit = (user: AppUser) => {
    setEditingEmail(user.email);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(user.password !== undefined && user.password !== null ? String(user.password) : '');
    setEditRole(user.role);
    setEditGrade((user.assignedGrade as any) || 'ม.1');
    setEditClass(user.assignedClassroom || '');
  };

  const handleSaveInlineEdit = (originalEmail: string) => {
    if (!editName.trim() || !editEmail.trim() || editPassword.trim() === '') {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (originalEmail !== editEmail && localUsers.some(u => u.email === editEmail)) {
      alert('มีผู้ใช้งานที่ใช้ชื่อผู้ใช้งานนี้แล้วในระบบ');
      return;
    }

    const updated = localUsers.map(u => {
      if (u.email === originalEmail) {
        return {
          name: editName.trim(),
          email: editEmail.trim(),
          role: editRole,
          password: editPassword.trim(),
          assignedGrade: ['Committee', 'Recorder'].includes(editRole) ? editGrade : undefined,
          assignedClassroom: editRole === 'Recorder' ? editClass || undefined : undefined
        };
      }
      return u;
    });

    setLocalUsers(updated);
    onSaveUsers(updated);
    setEditingEmail(null);
    onShowSuccess();
  };

  // Google Drive Linkage states
  const [driveLinksList, setDriveLinksList] = useState<GoogleDriveLink[]>(
    adminSettings.googleDriveLinks || []
  );
  const [selectedLinkGrade, setSelectedLinkGrade] = useState<'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'>('ม.1');
  const [selectedLinkRoom, setSelectedLinkRoom] = useState<string>('1');
  const [inputDriveLink, setInputDriveLink] = useState('');
  const [inputLinkNote, setInputLinkNote] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const getRoomsForGrade = (grade: string) => {
    const limit = ['ม.1', 'ม.2', 'ม.3'].includes(grade) ? 8 : 9;
    return Array.from({ length: limit }, (_, i) => (i + 1).toString());
  };

  const handleLinkGradeChange = (grade: 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6') => {
    setSelectedLinkGrade(grade);
    const rooms = getRoomsForGrade(grade);
    if (!rooms.includes(selectedLinkRoom)) {
      setSelectedLinkRoom('1');
    }
  };

  const handleSaveDriveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDriveLink.trim()) {
      alert('กรุณากรอกลิงก์ Google Drive');
      return;
    }

    let updatedLinks: GoogleDriveLink[];

    if (editingLinkId) {
      updatedLinks = driveLinksList.map(lnk => lnk.id === editingLinkId ? {
        ...lnk,
        gradeLevel: selectedLinkGrade,
        room: selectedLinkRoom,
        link: inputDriveLink.trim(),
        note: inputLinkNote.trim()
      } : lnk);
      setEditingLinkId(null);
    } else {
      if (driveLinksList.some(lnk => lnk.gradeLevel === selectedLinkGrade && lnk.room === selectedLinkRoom)) {
        alert(`มีลิงก์ Google Drive สำหรับห้อง ม.${selectedLinkGrade.replace('ม.', '')}/${selectedLinkRoom} อยู่แล้วในระบบ`);
        return;
      }
      const newLnk: GoogleDriveLink = {
        id: `link-${Date.now()}`,
        gradeLevel: selectedLinkGrade,
        room: selectedLinkRoom,
        link: inputDriveLink.trim(),
        note: inputLinkNote.trim()
      };
      updatedLinks = [...driveLinksList, newLnk];
    }

    setDriveLinksList(updatedLinks);
    
    const updatedSettings: AdminSettings = {
      ...adminSettings,
      googleDriveLinks: updatedLinks
    };
    onSaveSettings(updatedSettings);
    
    setInputDriveLink('');
    setInputLinkNote('');
    onShowSuccess();
  };

  const handleEditDriveLink = (lnk: GoogleDriveLink) => {
    setEditingLinkId(lnk.id);
    setSelectedLinkGrade(lnk.gradeLevel);
    setSelectedLinkRoom(lnk.room);
    setInputDriveLink(lnk.link);
    setInputLinkNote(lnk.note || '');
  };

  const handleDeleteDriveLink = (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบลิงก์ Google Drive นี้?')) return;
    const updatedLinks = driveLinksList.filter(lnk => lnk.id !== id);
    setDriveLinksList(updatedLinks);
    
    const updatedSettings: AdminSettings = {
      ...adminSettings,
      googleDriveLinks: updatedLinks
    };
    onSaveSettings(updatedSettings);
    onShowSuccess();
  };

  // State for Admin tabs
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'uploadHistory' | 'gradePlans' | 'subjectPlans' | 'activityPhotos' | 'classroomDocs' | 'googleSheets'>('users');
  const [uploadHistorySearch, setUploadHistorySearch] = useState('');
  const [uploadLogSortColumn, setUploadLogSortColumn] = useState<'classroomName' | 'fileName' | 'reporterName'>('classroomName');
  const [uploadLogSortDirection, setUploadLogSortDirection] = useState<'asc' | 'desc'>('asc');
  const [copiedFileUrl, setCopiedFileUrl] = useState<string | null>(null);

  const handleSortUploadLog = (col: 'classroomName' | 'fileName' | 'reporterName') => {
    if (uploadLogSortColumn === col) {
      setUploadLogSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setUploadLogSortColumn(col);
      setUploadLogSortDirection('asc');
    }
  };
  const [customSpreadsheetIdInput, setCustomSpreadsheetIdInput] = useState(spreadsheetId || '14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg');

  // Grade-level lesson plans states
  const [gradePlansList, setGradePlansList] = useState<GradePlanLink[]>(
    adminSettings.gradePlans || []
  );
  const [selectedGradePlanLevel, setSelectedGradePlanLevel] = useState<'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'>('ม.1');
  const [inputGradePlanLink, setInputGradePlanLink] = useState('');
  const [inputGradePlanNote, setInputGradePlanNote] = useState('');
  const [editingGradePlanId, setEditingGradePlanId] = useState<string | null>(null);

  const handleSaveGradePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputGradePlanLink.trim()) {
      alert('กรุณากรอกลิงก์ Google Drive');
      return;
    }

    let updatedPlans: GradePlanLink[];

    if (editingGradePlanId) {
      updatedPlans = gradePlansList.map(plan => plan.id === editingGradePlanId ? {
        ...plan,
        gradeLevel: selectedGradePlanLevel,
        link: inputGradePlanLink.trim(),
        note: inputGradePlanNote.trim()
      } : plan);
      setEditingGradePlanId(null);
    } else {
      if (gradePlansList.some(plan => plan.gradeLevel === selectedGradePlanLevel)) {
        alert(`มีลิงก์แผนการสอนสำหรับระดับชั้น ${selectedGradePlanLevel} อยู่แล้วในระบบ`);
        return;
      }
      const newPlan: GradePlanLink = {
        id: `grade-plan-${Date.now()}`,
        gradeLevel: selectedGradePlanLevel,
        link: inputGradePlanLink.trim(),
        note: inputGradePlanNote.trim()
      };
      updatedPlans = [...gradePlansList, newPlan];
    }

    setGradePlansList(updatedPlans);
    const updatedSettings: AdminSettings = {
      ...adminSettings,
      gradePlans: updatedPlans
    };
    onSaveSettings(updatedSettings);

    setInputGradePlanLink('');
    setInputGradePlanNote('');
    onShowSuccess();
  };

  const handleEditGradePlan = (plan: GradePlanLink) => {
    setEditingGradePlanId(plan.id);
    setSelectedGradePlanLevel(plan.gradeLevel);
    setInputGradePlanLink(plan.link);
    setInputGradePlanNote(plan.note || '');
  };

  const handleDeleteGradePlan = (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบลิงก์แผนการสอนระดับชั้นนี้?')) return;
    const updatedPlans = gradePlansList.filter(plan => plan.id !== id);
    setGradePlansList(updatedPlans);
    const updatedSettings: AdminSettings = {
      ...adminSettings,
      gradePlans: updatedPlans
    };
    onSaveSettings(updatedSettings);
    onShowSuccess();
  };

  // Subject-level lesson plans states
  const [subjectPlansList, setSubjectPlansList] = useState<SubjectPlanLink[]>(
    adminSettings.subjectPlans || []
  );
  const [selectedSubjectPlanLevel, setSelectedSubjectPlanLevel] = useState<'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'>('ม.1');
  const [inputSubjectPlanLink, setInputSubjectPlanLink] = useState('');
  const [inputSubjectPlanNote, setInputSubjectPlanNote] = useState('');
  const [editingSubjectPlanId, setEditingSubjectPlanId] = useState<string | null>(null);

  const handleSaveSubjectPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSubjectPlanLink.trim()) {
      alert('กรุณากรอกลิงก์ Google Drive');
      return;
    }

    let updatedPlans: SubjectPlanLink[];

    if (editingSubjectPlanId) {
      updatedPlans = subjectPlansList.map(plan => plan.id === editingSubjectPlanId ? {
        ...plan,
        gradeLevel: selectedSubjectPlanLevel,
        link: inputSubjectPlanLink.trim(),
        note: inputSubjectPlanNote.trim()
      } : plan);
      setEditingSubjectPlanId(null);
    } else {
      if (subjectPlansList.some(plan => plan.gradeLevel === selectedSubjectPlanLevel)) {
        alert(`มีลิงก์แผนการสอนรายวิชาสำหรับระดับชั้น ${selectedSubjectPlanLevel} อยู่แล้วในระบบ`);
        return;
      }
      const newPlan: SubjectPlanLink = {
        id: `subject-plan-${Date.now()}`,
        gradeLevel: selectedSubjectPlanLevel,
        link: inputSubjectPlanLink.trim(),
        note: inputSubjectPlanNote.trim()
      };
      updatedPlans = [...subjectPlansList, newPlan];
    }

    setSubjectPlansList(updatedPlans);
    const updatedSettings: AdminSettings = {
      ...adminSettings,
      subjectPlans: updatedPlans
    };
    onSaveSettings(updatedSettings);

    setInputSubjectPlanLink('');
    setInputSubjectPlanNote('');
    onShowSuccess();
  };

  const handleEditSubjectPlan = (plan: SubjectPlanLink) => {
    setEditingSubjectPlanId(plan.id);
    setSelectedSubjectPlanLevel(plan.gradeLevel);
    setInputSubjectPlanLink(plan.link);
    setInputSubjectPlanNote(plan.note || '');
  };

  const handleDeleteSubjectPlan = (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบลิงก์แผนการสอนรายวิชานี้?')) return;
    const updatedPlans = subjectPlansList.filter(plan => plan.id !== id);
    setSubjectPlansList(updatedPlans);
    const updatedSettings: AdminSettings = {
      ...adminSettings,
      subjectPlans: updatedPlans
    };
    onSaveSettings(updatedSettings);
    onShowSuccess();
  };

  // Activity-level photo links states
  const [activityPhotosList, setActivityPhotosList] = useState<ActivityPhotoLink[]>(
    adminSettings.activityPhotos || []
  );
  const [selectedActivityPhotoLevel, setSelectedActivityPhotoLevel] = useState<'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'>('ม.1');
  const [inputActivityPhotoLink, setInputActivityPhotoLink] = useState('');
  const [inputActivityPhotoNote, setInputActivityPhotoNote] = useState('');
  const [editingActivityPhotoId, setEditingActivityPhotoId] = useState<string | null>(null);

  const handleSaveActivityPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputActivityPhotoLink.trim()) {
      alert('กรุณากรอกลิงก์ Google Drive');
      return;
    }

    let updatedPhotos: ActivityPhotoLink[];

    if (editingActivityPhotoId) {
      updatedPhotos = activityPhotosList.map(photo => photo.id === editingActivityPhotoId ? {
        ...photo,
        gradeLevel: selectedActivityPhotoLevel,
        link: inputActivityPhotoLink.trim(),
        note: inputActivityPhotoNote.trim()
      } : photo);
      setEditingActivityPhotoId(null);
    } else {
      if (activityPhotosList.some(photo => photo.gradeLevel === selectedActivityPhotoLevel)) {
        alert(`มีลิงก์ภาพกิจกรรมสำหรับระดับชั้น ${selectedActivityPhotoLevel} อยู่แล้วในระบบ`);
        return;
      }
      const newPhoto: ActivityPhotoLink = {
        id: `activity-photo-${Date.now()}`,
        gradeLevel: selectedActivityPhotoLevel,
        link: inputActivityPhotoLink.trim(),
        note: inputActivityPhotoNote.trim()
      };
      updatedPhotos = [...activityPhotosList, newPhoto];
    }

    setActivityPhotosList(updatedPhotos);
    const updatedSettings: AdminSettings = {
      ...adminSettings,
      activityPhotos: updatedPhotos
    };
    onSaveSettings(updatedSettings);

    setInputActivityPhotoLink('');
    setInputActivityPhotoNote('');
    onShowSuccess();
  };

  const handleEditActivityPhoto = (photo: ActivityPhotoLink) => {
    setEditingActivityPhotoId(photo.id);
    setSelectedActivityPhotoLevel(photo.gradeLevel);
    setInputActivityPhotoLink(photo.link);
    setInputActivityPhotoNote(photo.note || '');
  };

  const handleDeleteActivityPhoto = (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบลิงก์ภาพกิจกรรมระดับชั้นนี้?')) return;
    const updatedPhotos = activityPhotosList.filter(photo => photo.id !== id);
    setActivityPhotosList(updatedPhotos);
    const updatedSettings: AdminSettings = {
      ...adminSettings,
      activityPhotos: updatedPhotos
    };
    onSaveSettings(updatedSettings);
    onShowSuccess();
  };

  // Settings states
  const [flowchartLink, setFlowchartLink] = useState(adminSettings.driveLinks.flowchart);
  const [brochureLink, setBrochureLink] = useState(adminSettings.driveLinks.brochure);
  const [workImageLink, setWorkImageLink] = useState(adminSettings.driveLinks.workImage);
  const [activityCollectionLink, setActivityCollectionLink] = useState(adminSettings.driveLinks.activityCollection);
  const [additionalDocLink, setAdditionalDocLink] = useState(adminSettings.driveLinks.additionalDoc);

  // Handle Add user
  const handleAddUser = () => {
    if (!newEmail.trim() || !newName.trim() || !newPassword.trim()) {
      alert('กรุณากรอกชื่อ ชื่อผู้ใช้งาน และรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (localUsers.some(u => u.email === newEmail)) {
      alert('มีผู้ใช้งานที่ใช้ชื่อผู้ใช้งานนี้แล้วในระบบ');
      return;
    }

    const newUser: AppUser = {
      email: newEmail,
      role: newRole,
      name: newName,
      password: newPassword.trim(),
      assignedGrade: ['Committee', 'Recorder'].includes(newRole) ? newGrade : undefined,
      assignedClassroom: newRole === 'Recorder' ? newClass || undefined : undefined
    };

    const updated = [...localUsers, newUser];
    setLocalUsers(updated);
    onSaveUsers(updated);
    
    // Clear inputs
    setNewEmail('');
    setNewName('');
    setNewPassword('');
    setNewClass('');
    onShowSuccess();
  };

  // Handle Delete user
  const handleDeleteUser = (email: string) => {
    if (email === currentUser.email) {
      alert('คุณไม่สามารถลบบัญชีผู้ใช้ของตัวคุณเองได้ขณะเข้าใช้งาน');
      return;
    }

    const updated = localUsers.filter(u => u.email !== email);
    setLocalUsers(updated);
    setDeletingUserEmail(null);
    onSaveUsers(updated);
    onShowSuccess();
  };

  // Handle Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: AdminSettings = {
      driveLinks: {
        flowchart: flowchartLink,
        brochure: brochureLink,
        workImage: workImageLink,
        activityCollection: activityCollectionLink,
        additionalDoc: additionalDocLink,
      }
    };
    onSaveSettings(updatedSettings);
    onShowSuccess();
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-900 rounded-[24px] p-8 text-center max-w-xl mx-auto space-y-4">
        <ShieldCheck className="w-16 h-16 text-red-500 mx-auto" />
        <h3 className="text-2xl font-bold">ไม่ได้รับอนุญาตให้เข้าถึง</h3>
        <p className="text-sm text-red-800 leading-relaxed font-medium">
          ระบบความปลอดภัยของโรงเรียนเบญจมานุสรณ์ ตรวจพบว่าบทบาทของคุณไม่ใช่ **ผู้ดูแลระบบ (Admin)** 
          ท่านจึงไม่สามารถเรียกดู แก้ไขสิทธิ์ผู้ใช้ หรือตั้งค่าลิงก์เชื่อมต่อ Google Drive ปลายทางได้ในระบบนี้
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-[#7D57B2]" />
          ระบบผู้ดูแลระบบ (Admin Control)
        </h2>
        <p className="text-sm text-[#6A5077] mt-1 font-medium">
          ควบคุมและจำกัดสิทธิ์การเข้าใช้งานของผู้บริหาร คณะกรรมการสายชั้น และกำหนดปลายทางคลาวด์รับรูปและไฟล์เอกสาร
        </p>
      </div>

      {/* Tab Menu Selector */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-[#F5F4F7] rounded-2xl border border-gray-100 w-full no-print">
        <button
          type="button"
          onClick={() => setActiveAdminTab('users')}
          className={`flex-1 min-w-[200px] px-5 py-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeAdminTab === 'users'
              ? 'bg-[#7D57B2] text-white shadow-sm'
              : 'text-[#6A5077] hover:bg-white/60 hover:text-[#7D57B2]'
          }`}
        >
          <Users className="w-4 h-4" />
          จัดการผู้ใช้งานและระดับสิทธิ์การเข้าถึง
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('uploadHistory')}
          className={`flex-1 min-w-[200px] px-5 py-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeAdminTab === 'uploadHistory'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-[#6A5077] hover:bg-white/60 hover:text-emerald-600'
          }`}
        >
          <Upload className="w-4 h-4" />
          ประวัติการอัปโหลดไฟล์ (Google Drive)
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('gradePlans')}
          className={`flex-1 min-w-[200px] px-5 py-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeAdminTab === 'gradePlans'
              ? 'bg-[#7D57B2] text-white shadow-sm'
              : 'text-[#6A5077] hover:bg-white/60 hover:text-[#7D57B2]'
          }`}
        >
          <Layers className="w-4 h-4" />
          แผนการสอน (ระดับชั้น)
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('subjectPlans')}
          className={`flex-1 min-w-[200px] px-5 py-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeAdminTab === 'subjectPlans'
              ? 'bg-[#7D57B2] text-white shadow-sm'
              : 'text-[#6A5077] hover:bg-white/60 hover:text-[#7D57B2]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          แผนการสอน (รายวิชา)
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('activityPhotos')}
          className={`flex-1 min-w-[200px] px-5 py-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeAdminTab === 'activityPhotos'
              ? 'bg-[#7D57B2] text-white shadow-sm'
              : 'text-[#6A5077] hover:bg-white/60 hover:text-[#7D57B2]'
          }`}
        >
          <Camera className="w-4 h-4" />
          ภาพกิจกรรม (ระดับชั้น)
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('classroomDocs')}
          className={`flex-1 min-w-[200px] px-5 py-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeAdminTab === 'classroomDocs'
              ? 'bg-[#E13A9D] text-white shadow-sm'
              : 'text-[#6A5077] hover:bg-white/60 hover:text-[#E13A9D]'
          }`}
        >
          <Globe className="w-4 h-4" />
          เอกสารประกอบ (รายห้องเรียน)
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('googleSheets')}
          className={`flex-1 min-w-[200px] px-5 py-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeAdminTab === 'googleSheets'
              ? 'bg-[#1696CC] text-white shadow-sm'
              : 'text-[#6A5077] hover:bg-white/60 hover:text-[#1696CC]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          ฐานข้อมูล Google Sheets API
        </button>
      </div>

      {/* ส่วนที่ 1: การจัดการผู้ใช้และสิทธิ์ (Authorization) - Full Width */}
      {activeAdminTab === 'users' && (
        <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-1.5">
              <Users className="w-5 h-5 text-[#7D57B2]" />
              จัดการผู้ใช้งานและระดับสิทธิ์การเข้าถึง (Authorization)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">แบ่งออกเป็น 4 ระดับบทบาท: Admin, Executive, Committee, Recorder</p>
          </div>

          {/* Quick Create user form */}
          <div className="p-4 bg-[#F5F4F7]/60 rounded-2xl border border-gray-100 space-y-4">
            <span className="text-xs text-gray-950 font-bold block mb-1">➕ เพิ่มบัญชีผู้ใช้ใหม่เข้าระบบโรงเรียน:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ชื่อผู้ใช้งาน</label>
                <input
                  type="text"
                  placeholder="ระบุชื่อผู้ใช้งาน"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ชื่อ-นามสกุลครูผู้สอน</label>
                <input
                  type="text"
                  placeholder="เช่น ครูณิชชา เก่งวิทยการ"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ระดับบทบาทสิทธิ์ (Role)</label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    setNewRole(r);
                    if (r === 'Recorder' && !newClass) {
                      setNewClass(`${newGrade}/1`);
                    }
                  }}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                >
                  <option value="Admin">ผู้ดูแลระบบ (Admin)</option>
                  <option value="Executive">ผู้บริหาร (ผอ. / รอง ผอ.)</option>
                  <option value="Committee">คณะกรรมการระดับชั้น (Committee)</option>
                  <option value="Recorder">ผู้บันทึกข้อมูล (Recorder)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#7D57B2]" />
                  รหัสผ่านสำหรับการเข้าใช้งาน (Password)
                </label>
                <input
                  type="text"
                  placeholder="ระบุรหัสผ่าน เช่น bms12345"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7D57B2] font-mono"
                />
              </div>

              {['Committee', 'Recorder'].includes(newRole) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-500 font-bold mb-1">ชั้นที่รับผิดชอบ</label>
                    <select
                      value={newGrade}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setNewGrade(val);
                        setNewClass(`${val}/1`);
                      }}
                      className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                    >
                      <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                      <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                      <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
                      <option value="ม.4">มัธยมศึกษาปีที่ 4</option>
                      <option value="ม.5">มัธยมศึกษาปีที่ 5</option>
                      <option value="ม.6">มัธยมศึกษาปีที่ 6</option>
                    </select>
                  </div>

                  {newRole === 'Recorder' && (
                    <div>
                      <label className="block text-[11px] text-gray-500 font-bold mb-1">ห้องที่ดูแล</label>
                      <select
                        value={newClass}
                        onChange={(e) => setNewClass(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                      >
                        <option value="">เลือกห้องเรียน</option>
                        {Array.from({ length: ['ม.1', 'ม.2', 'ม.3'].includes(newGrade) ? 8 : 9 }, (_, i) => {
                          const roomName = `${newGrade}/${i + 1}`;
                          return <option key={roomName} value={roomName}>{roomName}</option>;
                        })}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddUser}
              className="h-10 w-full bg-[#7D57B2] hover:bg-[#6b48a0] text-white text-xs font-bold rounded-xl shadow transition"
            >
              เพิ่มผู้ใช้และเปิดสิทธิ์ระบบ
            </button>
          </div>

          {/* User List Table */}
          <div className="overflow-x-auto border border-gray-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F4F7] text-[#6A5077] uppercase font-bold tracking-wider">
                  <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-3">ระดับบทบาทสิทธิ์ (Role)</th>
                  <th className="px-4 py-3">ชื่อผู้ใช้งาน</th>
                  <th className="px-4 py-3">รหัสผ่าน</th>
                  <th className="px-4 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {localUsers.map((user) => {
                  const isEditing = editingEmail === user.email;
                  return isEditing ? (
                    <tr key={user.email} className="bg-purple-50/50 hover:bg-purple-50 transition">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#7D57B2]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-1">
                          <select
                            value={editRole}
                            onChange={(e) => {
                              const r = e.target.value as UserRole;
                              setEditRole(r);
                              if (r === 'Recorder' && !editClass) {
                                setEditClass(`${editGrade}/1`);
                              }
                            }}
                            className="w-full h-8 px-1.5 bg-white border border-gray-300 rounded-lg text-[11px] font-bold text-gray-800 focus:outline-none"
                          >
                            <option value="Admin">ผู้ดูแลระบบ (Admin)</option>
                            <option value="Executive">ผู้บริหาร (Executive)</option>
                            <option value="Committee">คณะกรรมการระดับชั้น (Committee)</option>
                            <option value="Recorder">ผู้บันทึกข้อมูล (Recorder)</option>
                          </select>
                          {['Committee', 'Recorder'].includes(editRole) && (
                            <div className="flex gap-1">
                              <select
                                value={editGrade}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  setEditGrade(val);
                                  setEditClass(`${val}/1`);
                                }}
                                className="h-6 px-1 bg-white border border-gray-300 rounded text-[10px] focus:outline-none"
                              >
                                <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                                <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                                <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
                                <option value="ม.4">มัธยมศึกษาปีที่ 4</option>
                                <option value="ม.5">มัธยมศึกษาปีที่ 5</option>
                                <option value="ม.6">มัธยมศึกษาปีที่ 6</option>
                              </select>
                              {editRole === 'Recorder' && (
                                <select
                                  value={editClass}
                                  onChange={(e) => setEditClass(e.target.value)}
                                  className="h-6 px-1 bg-white border border-gray-300 rounded text-[10px] focus:outline-none"
                                >
                                  {Array.from({ length: ['ม.1', 'ม.2', 'ม.3'].includes(editGrade) ? 8 : 9 }, (_, i) => {
                                    const roomName = `${editGrade}/${i + 1}`;
                                    return <option key={roomName} value={roomName}>{roomName}</option>;
                                  })}
                                </select>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7D57B2]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#7D57B2]"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveInlineEdit(user.email)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition"
                            title="บันทึก"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEmail(null)}
                            className="bg-gray-400 hover:bg-gray-500 text-white p-1.5 rounded-lg transition"
                            title="ยกเลิก"
                          >
                            <span className="text-[10px] font-bold px-1 block leading-none">X</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={user.email} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 text-gray-900 font-bold">{user.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold block w-fit ${
                          user.role === 'Admin' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          user.role === 'Executive' ? 'bg-[#1696CC]/10 text-[#1696CC]' :
                          user.role === 'Committee' ? 'bg-[#7D57B2]/10 text-[#7D57B2]' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role === 'Admin' ? 'ผู้ดูแลระบบ' :
                           user.role === 'Executive' ? 'ผู้บริหาร' :
                           user.role === 'Committee' ? 'คณะกรรมการระดับชั้น' :
                           user.role === 'Recorder' ? 'ผู้บันทึกข้อมูล' : user.role}
                          {user.role === 'Committee' && ` (${user.assignedGrade})`}
                          {user.role === 'Recorder' && ` (${user.assignedClassroom || '—'})`}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-800 text-xs font-bold inline-block">
                          {user.password !== undefined && user.password !== null && String(user.password).trim() !== '' ? String(user.password) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {deletingUserEmail === user.email ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                              <span className="text-[10px] font-bold text-rose-700">ลบผู้ใช้นี้?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user.email)}
                                className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 transition"
                              >
                                ลบ
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingUserEmail(null)}
                                className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] font-medium hover:bg-gray-300 transition"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(user)}
                                className="text-[#1696CC] hover:text-[#1696CC]/80 p-1.5 rounded-lg hover:bg-blue-50 transition"
                                title="แก้ไขข้อมูลผู้ใช้"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingUserEmail(user.email)}
                                className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                                title="ลบผู้ใช้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ส่วนที่ 2.5: ประวัติการอัปโหลดไฟล์ไปยัง Google Drive & Sheets */}
      {activeAdminTab === 'uploadHistory' && (
        <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                ประวัติการอัปโหลดไฟล์และหลักฐานภาพถ่ายกิจกรรม (Google Drive & Sheets Logs)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                ติดตามรายการอัปโหลดไฟล์ ภาพถ่ายกิจกรรม และเอกสารนวัตกรรมเข้าสู่ Google Drive ID: <span className="font-mono text-emerald-700 font-bold">1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL</span> และบันทึกลิงก์เข้าสู่ Google Sheets ID: <span className="font-mono text-emerald-700 font-bold">14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg</span>
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://drive.google.com/drive/folders/1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition flex items-center gap-1.5 shadow-sm"
              >
                <Folder className="w-4 h-4 text-emerald-600" />
                เปิดโฟลเดอร์ Google Drive ↗
              </a>
              <a
                href="https://docs.google.com/spreadsheets/d/14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3.5 bg-purple-50 hover:bg-purple-100 text-[#7D57B2] text-xs font-bold rounded-xl border border-purple-200 transition flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#7D57B2]" />
                เปิดฐานข้อมูล Google Sheet ↗
              </a>
            </div>
          </div>

          {/* Banner Summary Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-white rounded-2xl border border-emerald-100 flex items-start gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-emerald-900 block">📁 Google Drive Target Folder</span>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded inline-block font-bold select-all">
                  1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL
                </span>
                <p className="text-[11px] text-gray-500">ปลายทางจัดเก็บไฟล์และรูปภาพหลักฐานกิจกรรมของทุกห้องเรียน</p>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50/80 to-white rounded-2xl border border-purple-100 flex items-start gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-[#7D57B2]" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-[#7D57B2] block">📊 Google Sheets Log Database</span>
                <span className="text-[11px] font-mono text-purple-900 bg-purple-100/60 px-2 py-0.5 rounded inline-block font-bold select-all">
                  14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg
                </span>
                <p className="text-[11px] text-gray-500">บันทึกลิงก์และประวัติการรายงานผลงานนวัตกรรมอัตโนมัติ</p>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={uploadHistorySearch}
                onChange={(e) => setUploadHistorySearch(e.target.value)}
                placeholder="ค้นหาตามห้องเรียน ผู้รายงาน หรือชื่อไฟล์..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
            {copiedFileUrl && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl animate-fade-in flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {copiedFileUrl}
              </span>
            )}
          </div>

          {/* Table of Upload Logs */}
          <div className="overflow-x-auto border border-gray-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F4F7] text-[#6A5077] uppercase font-bold tracking-wider select-none">
                  <th
                    onClick={() => handleSortUploadLog('classroomName')}
                    className="px-4 py-3 cursor-pointer hover:bg-purple-100/60 transition group"
                    title="กดเพื่อเรียงลำดับตามระดับชั้น / ห้องเรียน"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ระดับชั้น / ห้องเรียน</span>
                      {uploadLogSortColumn === 'classroomName' ? (
                        uploadLogSortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-purple-700" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-purple-700" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-50 group-hover:opacity-100 transition" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortUploadLog('fileName')}
                    className="px-4 py-3 cursor-pointer hover:bg-purple-100/60 transition group"
                    title="กดเพื่อเรียงลำดับตามภาพถ่ายกิจกรรม/ชื่อไฟล์"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ภาพถ่ายกิจกรรม (วช.13)</span>
                      {uploadLogSortColumn === 'fileName' ? (
                        uploadLogSortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-purple-700" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-purple-700" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-50 group-hover:opacity-100 transition" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortUploadLog('reporterName')}
                    className="px-4 py-3 cursor-pointer hover:bg-purple-100/60 transition group"
                    title="กดเพื่อเรียงลำดับตามผู้บันทึก / ผู้รายงาน"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ผู้บันทึก / ผู้รายงาน</span>
                      {uploadLogSortColumn === 'reporterName' ? (
                        uploadLogSortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-purple-700" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-purple-700" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-50 group-hover:opacity-100 transition" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {(() => {
                  const fileLogs: Array<{
                    id: string;
                    classroomName: string;
                    reporterName: string;
                    fileTypeKey: string;
                    fileTypeLabel: string;
                    fileName: string;
                    fileUrl: string;
                  }> = [];

                  const labelMap: Record<string, string> = {
                    workImage: '📸 ภาพถ่ายกิจกรรม (วช.13)',
                    activityCollection: '🖼️ ภาพประมวลกิจกรรม'
                  };

                  classroomInnovations.forEach((item) => {
                    if (item.files) {
                      Object.entries(item.files).forEach(([key, f]) => {
                        // Only keep activity photo image files (workImage or activityCollection)
                        if (key === 'workImage' || key === 'activityCollection') {
                          const fileObj = f as UploadedFile | undefined;
                          if (fileObj && (fileObj.name || fileObj.url)) {
                            fileLogs.push({
                              id: `${item.id}-${key}`,
                              classroomName: item.classroomName || '—',
                              reporterName: item.reporterName || '—',
                              fileTypeKey: key,
                              fileTypeLabel: labelMap[key] || '📸 ภาพถ่ายกิจกรรม',
                              fileName: fileObj.name || 'ภาพถ่ายกิจกรรม',
                              fileUrl: fileObj.url || ''
                            });
                          }
                        }
                      });
                    }
                  });

                  // Add PLC Activity Images
                  plcActivities.forEach((plc) => {
                    if (plc.images && plc.images.length > 0) {
                      plc.images.forEach((imgUrl, imgIndex) => {
                        if (imgUrl) {
                          fileLogs.push({
                            id: `plc-${plc.id}-img-${imgIndex}`,
                            classroomName: `สายชั้น ${plc.gradeLevel} (ครั้งที่ ${plc.times})`,
                            reporterName: plc.recorderName || plc.plcLeader || '—',
                            fileTypeKey: `plcImage_${imgIndex + 1}`,
                            fileTypeLabel: `📸 ภาพถ่ายกิจกรรม PLC (ภาพที่ ${imgIndex + 1})`,
                            fileName: `ภาพกิจกรรม PLC ครั้งที่ ${plc.times} (${plc.groupName || plc.gradeLevel})`,
                            fileUrl: imgUrl
                          });
                        }
                      });
                    }
                  });

                  const filteredLogs = fileLogs.filter(log =>
                    !uploadHistorySearch ||
                    log.classroomName.toLowerCase().includes(uploadHistorySearch.toLowerCase()) ||
                    log.reporterName.toLowerCase().includes(uploadHistorySearch.toLowerCase()) ||
                    log.fileName.toLowerCase().includes(uploadHistorySearch.toLowerCase()) ||
                    log.fileTypeLabel.toLowerCase().includes(uploadHistorySearch.toLowerCase())
                  );

                  const sortedLogs = [...filteredLogs].sort((a, b) => {
                    let valA = '';
                    let valB = '';

                    if (uploadLogSortColumn === 'classroomName') {
                      valA = a.classroomName;
                      valB = b.classroomName;
                    } else if (uploadLogSortColumn === 'fileName') {
                      valA = `${a.fileTypeLabel} ${a.fileName}`;
                      valB = `${b.fileTypeLabel} ${b.fileName}`;
                    } else if (uploadLogSortColumn === 'reporterName') {
                      valA = a.reporterName;
                      valB = b.reporterName;
                    }

                    const cmp = valA.localeCompare(valB, 'th', { numeric: true, sensitivity: 'base' });
                    return uploadLogSortDirection === 'asc' ? cmp : -cmp;
                  });

                  if (sortedLogs.length === 0) {
                    return (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-gray-400 font-medium">
                          {uploadHistorySearch ? 'ไม่พบข้อมูลภาพถ่ายกิจกรรมที่ตรงกับการค้นหา' : 'ยังไม่มีประวัติภาพถ่ายกิจกรรม (วช.13) ในระบบ'}
                        </td>
                      </tr>
                    );
                  }

                  return sortedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3 font-bold text-gray-950">
                        <span className="bg-purple-100 text-[#7D57B2] text-xs font-black px-2.5 py-1 rounded-lg inline-block">
                          {log.classroomName}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 max-w-xs">
                        <div className="flex items-center gap-2.5">
                          {log.fileUrl && (log.fileUrl.startsWith('blob:') || log.fileUrl.includes('drive.google') || log.fileUrl.includes('lh3.googleusercontent') || log.fileUrl.endsWith('.jpg') || log.fileUrl.endsWith('.png') || log.fileUrl.endsWith('.jpeg')) ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-50 flex items-center justify-center shadow-sm">
                              <img src={log.fileUrl} alt={log.fileName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                            </div>
                          ) : (
                            <FileImage className="w-6 h-6 text-emerald-600 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="text-[11px] font-bold text-emerald-800 block">
                              {log.fileTypeLabel}
                            </span>
                            <span className="text-xs text-gray-800 truncate block font-medium" title={log.fileName}>
                              {log.fileName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-semibold">
                        {log.reporterName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {log.fileUrl && (
                            <a
                              href={log.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                              title="เปิดรูปภาพใน Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              เปิดดูภาพ
                            </a>
                          )}
                          {log.fileUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(log.fileUrl);
                                setCopiedFileUrl('คัดลอกลิงก์รูปภาพสำเร็จ!');
                                setTimeout(() => setCopiedFileUrl(null), 2500);
                              }}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                              title="คัดลอกลิงก์"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* แผนการสอน (ระดับชั้น) */}
      {activeAdminTab === 'gradePlans' && (
        <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-1.5">
              <Layers className="w-5 h-5 text-[#7D57B2]" />
              กำหนดลิงก์ Google Drive ของระดับชั้น (แผนการสอนระดับชั้น)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">ระบุลิงก์แหล่งข้อมูล Google Drive เพื่อเก็บข้อมูลแผนการสอนบูรณาการ แยกตามแต่ละระดับชั้น</p>
          </div>

          {/* Form to Create/Edit grade level plans */}
          <form onSubmit={handleSaveGradePlan} className="p-5 bg-[#F5F4F7]/60 rounded-2xl border border-gray-100 space-y-4">
            <span className="text-xs text-gray-950 font-bold block mb-1">
              {editingGradePlanId ? '📝 แก้ไขลิงก์ Google Drive ของระดับชั้น:' : '➕ เพิ่มลิงก์ Google Drive ของระดับชั้นใหม่:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ระดับชั้น (Grade Level)</label>
                <select
                  value={selectedGradePlanLevel}
                  onChange={(e) => setSelectedGradePlanLevel(e.target.value as any)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                >
                  <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                  <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                  <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
                  <option value="ม.4">มัธยมศึกษาปีที่ 4</option>
                  <option value="ม.5">มัธยมศึกษาปีที่ 5</option>
                  <option value="ม.6">มัธยมศึกษาปีที่ 6</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ลิงก์ Google Drive ของระดับชั้น (URL)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={inputGradePlanLink}
                  onChange={(e) => setInputGradePlanLink(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7D57B2] font-mono text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">หมายเหตุ (Remarks)</label>
                <input
                  type="text"
                  placeholder="ระบุข้อความ/หมายเหตุ เช่น แผนการสอนบูรณาการและรูปภาพกิจกรรม ม.1"
                  value={inputGradePlanNote}
                  onChange={(e) => setInputGradePlanNote(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {editingGradePlanId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingGradePlanId(null);
                    setInputGradePlanLink('');
                    setInputGradePlanNote('');
                  }}
                  className="h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                >
                  ยกเลิกแก้ไข
                </button>
              )}
              <button
                type="submit"
                className="h-10 px-6 bg-[#7D57B2] hover:bg-[#6b48a0] text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> {editingGradePlanId ? 'อัปเดตลิงก์แผนการสอน' : 'บันทึกแหล่งข้อมูลแผนการสอน'}
              </button>
            </div>
          </form>

          {/* Table displaying grade plans */}
          <div className="overflow-x-auto border border-gray-100 rounded-2xl mt-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F4F7] text-[#6A5077] uppercase font-bold tracking-wider">
                  <th className="px-4 py-3">ระดับชั้น</th>
                  <th className="px-4 py-3">ลิงก์ Google Drive แผนการสอน (ระดับชั้น)</th>
                  <th className="px-4 py-3">หมายเหตุ</th>
                  <th className="px-4 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {gradePlansList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-semibold">
                      ยังไม่มีการระบุลิงก์แผนการสอนสำหรับระดับชั้นในระบบ
                    </td>
                  </tr>
                ) : (
                  gradePlansList.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 font-bold text-gray-900">
                        มัธยมศึกษาปีที่ {plan.gradeLevel.replace('ม.', '')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#7D57B2] truncate max-w-xs">
                        <a
                          href={plan.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <span className="truncate">{plan.link}</span>
                          <span className="text-[10px] bg-[#7D57B2]/10 text-[#7D57B2] px-1 py-0.5 rounded shrink-0 font-bold font-mono">OPEN ↗</span>
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{plan.note || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditGradePlan(plan)}
                            className="text-[#7D57B2] hover:text-[#7D57B2]/80 p-1.5 rounded-lg hover:bg-[#7D57B2]/10 transition"
                            title="แก้ไขข้อมูลลิงก์"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGradePlan(plan.id)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                            title="ลบข้อมูลลิงก์"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* แผนการสอน (รายวิชา) */}
      {activeAdminTab === 'subjectPlans' && (
        <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-1.5">
              <BookOpen className="w-5 h-5 text-[#7D57B2]" />
              กำหนดลิงก์ Google Drive ของระดับชั้น (แผนการสอนรายวิชา)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">ระบุลิงก์แหล่งข้อมูล Google Drive เพื่อเก็บข้อมูลแผนการสอนรายวิชาแยกตามแต่ละระดับชั้น</p>
          </div>

          {/* Form to Create/Edit subject level plans */}
          <form onSubmit={handleSaveSubjectPlan} className="p-5 bg-[#F5F4F7]/60 rounded-2xl border border-gray-100 space-y-4">
            <span className="text-xs text-gray-950 font-bold block mb-1">
              {editingSubjectPlanId ? '📝 แก้ไขลิงก์ Google Drive แผนรายวิชาของระดับชั้น:' : '➕ เพิ่มลิงก์ Google Drive แผนรายวิชาของระดับชั้นใหม่:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ระดับชั้น (Grade Level)</label>
                <select
                  value={selectedSubjectPlanLevel}
                  onChange={(e) => setSelectedSubjectPlanLevel(e.target.value as any)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                >
                  <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                  <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                  <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
                  <option value="ม.4">มัธยมศึกษาปีที่ 4</option>
                  <option value="ม.5">มัธยมศึกษาปีที่ 5</option>
                  <option value="ม.6">มัธยมศึกษาปีที่ 6</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ลิงก์ Google Drive ของระดับชั้น (URL)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={inputSubjectPlanLink}
                  onChange={(e) => setInputSubjectPlanLink(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7D57B2] font-mono text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">หมายเหตุ (Remarks)</label>
                <input
                  type="text"
                  placeholder="ระบุข้อความ/หมายเหตุ เช่น แผนการสอนรายวิชา ม.1 ทั้ง 8 กลุ่มสาระ"
                  value={inputSubjectPlanNote}
                  onChange={(e) => setInputSubjectPlanNote(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {editingSubjectPlanId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubjectPlanId(null);
                    setInputSubjectPlanLink('');
                    setInputSubjectPlanNote('');
                  }}
                  className="h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                >
                  ยกเลิกแก้ไข
                </button>
              )}
              <button
                type="submit"
                className="h-10 px-6 bg-[#7D57B2] hover:bg-[#6b48a0] text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> {editingSubjectPlanId ? 'อัปเดตลิงก์แผนรายวิชา' : 'บันทึกแหล่งข้อมูลแผนรายวิชา'}
              </button>
            </div>
          </form>

          {/* Table displaying subject plans */}
          <div className="overflow-x-auto border border-gray-100 rounded-2xl mt-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F4F7] text-[#6A5077] uppercase font-bold tracking-wider">
                  <th className="px-4 py-3">ระดับชั้น</th>
                  <th className="px-4 py-3">ลิงก์ Google Drive แผนการสอน (รายวิชา)</th>
                  <th className="px-4 py-3">หมายเหตุ</th>
                  <th className="px-4 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {subjectPlansList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-semibold">
                      ยังไม่มีการระบุลิงก์แผนการสอนรายวิชาในระบบ
                    </td>
                  </tr>
                ) : (
                  subjectPlansList.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 font-bold text-gray-900">
                        มัธยมศึกษาปีที่ {plan.gradeLevel.replace('ม.', '')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#7D57B2] truncate max-w-xs">
                        <a
                          href={plan.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <span className="truncate">{plan.link}</span>
                          <span className="text-[10px] bg-[#7D57B2]/10 text-[#7D57B2] px-1 py-0.5 rounded shrink-0 font-bold font-mono">OPEN ↗</span>
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{plan.note || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditSubjectPlan(plan)}
                            className="text-[#7D57B2] hover:text-[#7D57B2]/80 p-1.5 rounded-lg hover:bg-[#7D57B2]/10 transition"
                            title="แก้ไขข้อมูลลิงก์"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubjectPlan(plan.id)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                            title="ลบข้อมูลลิงก์"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ภาพกิจกรรม (ระดับชั้น) */}
      {activeAdminTab === 'activityPhotos' && (
        <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-1.5">
              <Camera className="w-5 h-5 text-[#7D57B2]" />
              กำหนดลิงก์ Google Drive ของระดับชั้น (ภาพกิจกรรม)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">ระบุลิงก์แหล่งข้อมูล Google Drive เพื่อเก็บข้อมูลรูปภาพประการทำกิจกรรม แยกตามแต่ละระดับชั้น</p>
          </div>

          {/* Form to Create/Edit activity photo links */}
          <form onSubmit={handleSaveActivityPhoto} className="p-5 bg-[#F5F4F7]/60 rounded-2xl border border-gray-100 space-y-4">
            <span className="text-xs text-gray-950 font-bold block mb-1">
              {editingActivityPhotoId ? '📝 แก้ไขลิงก์ Google Drive ภาพกิจกรรมของระดับชั้น:' : '➕ เพิ่มลิงก์ Google Drive ภาพกิจกรรมของระดับชั้นใหม่:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ระดับชั้น (Grade Level)</label>
                <select
                  value={selectedActivityPhotoLevel}
                  onChange={(e) => setSelectedActivityPhotoLevel(e.target.value as any)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                >
                  <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                  <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                  <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
                  <option value="ม.4">มัธยมศึกษาปีที่ 4</option>
                  <option value="ม.5">มัธยมศึกษาปีที่ 5</option>
                  <option value="ม.6">มัธยมศึกษาปีที่ 6</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ลิงก์ Google Drive ของระดับชั้น (URL)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={inputActivityPhotoLink}
                  onChange={(e) => setInputActivityPhotoLink(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7D57B2] font-mono text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">หมายเหตุ (Remarks)</label>
                <input
                  type="text"
                  placeholder="ระบุข้อความ/หมายเหตุ เช่น รูปภาพการทำกิจกรรม ม.1"
                  value={inputActivityPhotoNote}
                  onChange={(e) => setInputActivityPhotoNote(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {editingActivityPhotoId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingActivityPhotoId(null);
                    setInputActivityPhotoLink('');
                    setInputActivityPhotoNote('');
                  }}
                  className="h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                >
                  ยกเลิกแก้ไข
                </button>
              )}
              <button
                type="submit"
                className="h-10 px-6 bg-[#7D57B2] hover:bg-[#6b48a0] text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> {editingActivityPhotoId ? 'อัปเดตลิงก์ภาพกิจกรรม' : 'บันทึกแหล่งข้อมูลภาพกิจกรรม'}
              </button>
            </div>
          </form>

          {/* Table displaying activity photos */}
          <div className="overflow-x-auto border border-gray-100 rounded-2xl mt-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F4F7] text-[#6A5077] uppercase font-bold tracking-wider">
                  <th className="px-4 py-3">ระดับชั้น</th>
                  <th className="px-4 py-3">ลิงก์ Google Drive ภาพกิจกรรม (ระดับชั้น)</th>
                  <th className="px-4 py-3">หมายเหตุ</th>
                  <th className="px-4 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {activityPhotosList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-semibold">
                      ยังไม่มีการระบุลิงก์ภาพกิจกรรมสำหรับระดับชั้นในระบบ
                    </td>
                  </tr>
                ) : (
                  activityPhotosList.map((photo) => (
                    <tr key={photo.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 font-bold text-gray-900">
                        มัธยมศึกษาปีที่ {photo.gradeLevel.replace('ม.', '')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#7D57B2] truncate max-w-xs">
                        <a
                          href={photo.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <span className="truncate">{photo.link}</span>
                          <span className="text-[10px] bg-[#7D57B2]/10 text-[#7D57B2] px-1 py-0.5 rounded shrink-0 font-bold font-mono">OPEN ↗</span>
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{photo.note || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditActivityPhoto(photo)}
                            className="text-[#7D57B2] hover:text-[#7D57B2]/80 p-1.5 rounded-lg hover:bg-[#7D57B2]/10 transition"
                            title="แก้ไขข้อมูลลิงก์"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivityPhoto(photo.id)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                            title="ลบข้อมูลลิงก์"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* เอกสารประกอบ (รายห้องเรียน) */}
      {activeAdminTab === 'classroomDocs' && (
        <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-1.5">
              <Globe className="w-5 h-5 text-[#E13A9D]" />
              กำหนดลิงก์ Google Drive รายห้องเรียน (Classroom Data Links)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">ระบุลิงก์แหล่งข้อมูล Google Drive และหมายเหตุแยกตามแต่ละห้องเรียน</p>
          </div>

          {/* Form to Create/Edit classroom drive links */}
          <form onSubmit={handleSaveDriveLink} className="p-5 bg-[#F5F4F7]/60 rounded-2xl border border-gray-100 space-y-4">
            <span className="text-xs text-gray-950 font-bold block mb-1">
              {editingLinkId ? '📝 แก้ไขลิงก์ Google Drive ของห้องเรียน:' : '➕ เพิ่มลิงก์ Google Drive รายห้องเรียนใหม่:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ระดับชั้น (Grade Level)</label>
                <select
                  value={selectedLinkGrade}
                  onChange={(e) => handleLinkGradeChange(e.target.value as any)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E13A9D]"
                >
                  <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                  <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                  <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
                  <option value="ม.4">มัธยมศึกษาปีที่ 4</option>
                  <option value="ม.5">มัธยมศึกษาปีที่ 5</option>
                  <option value="ม.6">มัธยมศึกษาปีที่ 6</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ห้องเรียน (Classroom Room)</label>
                <select
                  value={selectedLinkRoom}
                  onChange={(e) => setSelectedLinkRoom(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E13A9D]"
                >
                  {getRoomsForGrade(selectedLinkGrade).map((roomNo) => (
                    <option key={roomNo} value={roomNo}>
                      ห้อง {roomNo} {['ม.1', 'ม.2', 'ม.3'].includes(selectedLinkGrade) && parseInt(roomNo) === 8 ? '(ห้องสุดท้าย)' : ''} {['ม.4', 'ม.5', 'ม.6'].includes(selectedLinkGrade) && parseInt(roomNo) === 9 ? '(ห้องสุดท้าย)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-[11px] text-gray-500 font-bold mb-1">ลิงก์ Google Drive (URL)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={inputDriveLink}
                  onChange={(e) => setInputDriveLink(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E13A9D] font-mono text-gray-700"
                  required
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-[11px] text-gray-500 font-bold mb-1">หมายเหตุ (Remarks)</label>
                <input
                  type="text"
                  placeholder="ระบุข้อความ/หมายเหตุ เช่น ใช้รวบรวมงานห้องเรียน"
                  value={inputLinkNote}
                  onChange={(e) => setInputLinkNote(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#E13A9D]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {editingLinkId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLinkId(null);
                    setInputDriveLink('');
                    setInputLinkNote('');
                  }}
                  className="h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                >
                  ยกเลิกแก้ไข
                </button>
              )}
              <button
                type="submit"
                className="h-10 px-6 bg-[#E13A9D] hover:bg-[#ce2989] text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> {editingLinkId ? 'อัปเดตลิงก์แหล่งข้อมูล' : 'บันทึกแหล่งข้อมูล Google Drive'}
              </button>
            </div>
          </form>

          {/* Table displaying the saved Google Drive classroom links */}
          <div className="overflow-x-auto border border-gray-100 rounded-2xl mt-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F4F7] text-[#6A5077] uppercase font-bold tracking-wider">
                  <th className="px-4 py-3">ระดับชั้น / ห้องเรียน</th>
                  <th className="px-4 py-3">ลิงก์ Google Drive ปลายทาง</th>
                  <th className="px-4 py-3">หมายเหตุ</th>
                  <th className="px-4 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {driveLinksList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-semibold">
                      ยังไม่มีการระบุลิงก์ Google Drive สำหรับห้องเรียนในระบบ
                    </td>
                  </tr>
                ) : (
                  driveLinksList.map((lnk) => (
                    <tr key={lnk.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 font-bold text-gray-900">
                        มัธยมศึกษาปีที่ {lnk.gradeLevel.replace('ม.', '')}/{lnk.room}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#1696CC] truncate max-w-xs">
                        <a
                          href={lnk.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <span className="truncate">{lnk.link}</span>
                          <span className="text-[10px] bg-[#1696CC]/10 text-[#1696CC] px-1 py-0.5 rounded shrink-0">OPEN ↗</span>
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lnk.note || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditDriveLink(lnk)}
                            className="text-[#1696CC] hover:text-[#1696CC]/80 p-1 rounded-lg hover:bg-blue-50"
                            title="แก้ไขข้อมูลลิงก์"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDriveLink(lnk.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50"
                            title="ลบข้อมูลลิงก์"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ส่วนที่ 6: ฐานข้อมูล Google Sheets API (OAuth 2.0) */}
      {activeAdminTab === 'googleSheets' && (
        <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-1.5">
              <FileSpreadsheet className="w-6 h-6 text-[#1696CC]" />
              เชื่อมต่อฐานข้อมูล Google Sheets API (OAuth 2.0 Real-Time Sync)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              จัดเก็บและเชื่อมต่อข้อมูลของระบบแบบเรียลไทม์ไปยัง Google Sheets API โดยตรง ไม่ผ่านเซิร์ฟเวอร์ภายนอกและไม่ใช่ Apps Script
            </p>
          </div>

          {/* Connection Status Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              
              {spreadsheetId ? (
                // Connected State (Auto-connected by default)
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-md font-extrabold text-emerald-950">เชื่อมต่อ Google Sheets อัตโนมัติเรียบร้อยแล้ว</h4>
                        <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold">
                          Single Source of Truth
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 font-medium">
                        บัญชี Google: <span className="font-bold underline">{sheetsUser?.email || 'สิทธิ์การเชื่อมต่อหลักโรงเรียนเบญจมานุสรณ์'}</span>
                      </p>
                      <p className="text-[11px] text-emerald-700/80 font-bold">
                        สถานะระบบ: เชื่อมโยงฐานข้อมูลแผ่นงาน PLC Connect บันทึกและดึงข้อมูลจาก Google Sheets เป็นหลักโดยอัตโนมัติ
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-emerald-100/60 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[11px] text-emerald-800/80 font-bold">ไอดีแผ่นงาน (Spreadsheet ID)</span>
                      <span className="text-[11px] font-mono text-emerald-900 bg-emerald-100/50 px-2 py-1 rounded block truncate font-bold select-all mt-1" title={spreadsheetId}>
                        {spreadsheetId}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-emerald-800/80 font-bold">ซิงค์ล่าสุด (Last Synced)</span>
                      <span className="text-xs font-bold text-emerald-900 mt-1 block">
                        {lastSynced ? `🕒 ${lastSynced} น.` : 'เรียลไทม์ (Auto Sync)'}
                      </span>
                    </div>
                  </div>

                  {syncError && (
                    <div className="bg-rose-100 border border-rose-200 text-rose-900 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>พบข้อผิดพลาดขณะซิงค์: {syncError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      เปิด Google Sheet ↗
                    </a>
                    
                    <button
                      type="button"
                      onClick={onForcePull}
                      disabled={isSyncing}
                      className="h-10 px-4 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="w-4 h-4" />
                      )}
                      ดึงข้อมูลล่าสุดจากชีต (Pull)
                    </button>

                    <button
                      type="button"
                      onClick={() => onConnectSheets()}
                      disabled={isSyncing}
                      className="h-10 px-4 bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Database className="w-4 h-4" />
                      {sheetsToken ? 'เข้าสู่ระบบด้วย Google อีกครั้ง' : 'เข้าสู่ระบบด้วย Google / สิทธิ์เขียนข้อมูล'}
                    </button>
                  </div>

                </div>
              ) : null}

            </div>

            {/* Instruction Side Card */}
            <div className="bg-[#F5F4F7]/60 border border-gray-100 rounded-2xl p-5 space-y-4 text-xs font-medium text-[#6A5077] leading-relaxed">
              <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-1">
                <Database className="w-4 h-4 text-[#7D57B2]" /> 
                วิธีการทำงาน & โครงสร้างแผ่นงาน
              </h4>
              <ul className="space-y-2.5 list-disc pl-4 text-gray-700 font-semibold">
                <li>ค่าเริ่มต้นจะเชื่อมโยงกับ Google Sheets ID: <span className="font-mono text-purple-700 bg-purple-50 px-1 py-0.5 rounded font-extrabold select-all">14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg</span></li>
                <li>เมื่อกดเข้าสู่ระบบ Google สิทธิ์การเข้าถึงจะถูกจัดเก็บเพื่อใช้ซิงค์ข้อมูลผ่าน Google Sheets API</li>
                <li>แท็บฐานข้อมูลหลักประกอบด้วย: <span className="font-bold text-gray-900">Users, MasterInnovations, PLCActivities, ClassroomInnovations, AdminSettings, UploadLogs</span></li>
                <li>หากใช้งานผ่าน Vercel/GitHub และระบบแจ้งเตือน Auth Domain Error ให้เพิ่มโดเมน Vercel ของคุณใน Firebase Console (Authentication &gt; Authorized domains)</li>
                <li>เมื่อเพิ่ม/แก้ไขข้อมูล ข้อมูลจะถูกซิงค์ตรงไปยัง Google Sheets และ Google Drive โดยอัตโนมัติ</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

