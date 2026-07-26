import React, { useState, useEffect, useRef } from 'react';
import { ClassroomInnovation, MasterInnovation, AppUser, CompetencyTemplate, UploadedFile, AdminSettings } from '../types';
import { Save, Eye, FileText, Upload, ShieldAlert, Check, CheckCircle, Info, HelpCircle, ExternalLink, BookOpen } from 'lucide-react';
import { uploadFileToDriveAndLogToSheet, getCachedToken, googleSignIn, TARGET_DRIVE_FOLDER_ID, TARGET_SPREADSHEET_ID } from '../lib/sheetsService';

interface System3ClassroomProps {
  currentUser: AppUser;
  masterInnovations: MasterInnovation[];
  classroomInnovations: ClassroomInnovation[];
  adminSettings: AdminSettings;
  onSave: (record: ClassroomInnovation) => void;
  onShowSuccess: () => void;
}

export const System3Classroom: React.FC<System3ClassroomProps> = ({
  currentUser,
  masterInnovations,
  classroomInnovations,
  adminSettings,
  onSave,
  onShowSuccess
}) => {
  const isAllAccess = currentUser.role === 'Admin';
  const isRecorder = currentUser.role === 'Recorder';
  const userClassroom = currentUser.assignedClassroom || (currentUser.assignedGrade ? `${currentUser.assignedGrade}/1` : 'ม.1/1');

  // State to manage active editing classroom
  const [selectedClass, setSelectedClass] = useState<string>(
    isRecorder ? userClassroom : 'ม.1/1'
  );

  // Sync active classroom on user switch if Recorder
  useEffect(() => {
    if (isRecorder && userClassroom) {
      setSelectedClass(userClassroom);
    }
  }, [currentUser.email, isRecorder, userClassroom]);

  // Derive Grade Level from Classroom Name (e.g. "ม.1/1" -> "ม.1")
  const gradeLevel = (selectedClass.split('/')[0] || 'ม.1') as 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6';

  // Find linked Master Innovation
  const linkedMaster = masterInnovations.find(m => m.gradeLevel === gradeLevel);

  // Auto-populated Teachers: From Master committees where advisoryClass matches selectedClass
  const autoTeachers = linkedMaster
    ? linkedMaster.committees.filter(c => c.advisoryClass === selectedClass).map(c => c.name)
    : [];

  // Form states
  const [innovationName, setInnovationName] = useState('');
  const [memberCount, setMemberCount] = useState<number>(35);
  
  // Committees
  const [committees, setCommittees] = useState({
    president: '',
    vicePresident: '',
    publicRelations: '',
    treasurer: '',
    secretary: ''
  });

  // Descriptions
  const [briefDetails, setBriefDetails] = useState('');
  const [goals, setGoals] = useState('');
  const [expectedBenefits, setExpectedBenefits] = useState('');

  // 11 Competencies custom definitions
  const [customCompetencies, setCustomCompetencies] = useState<CompetencyTemplate>({
    thai: '', math: '', science: '', technology: '', social: '',
    english: '', chinese: '', career: '', health: '', art: '', guidance: ''
  });

  // Responsible
  const [reporterName, setReporterName] = useState('');
  const [classroomPresident, setClassroomPresident] = useState('');

  // File states (mock status and storage to fulfill Requirement 6)
  const [files, setFiles] = useState<{
    flowchart?: UploadedFile;
    brochure?: UploadedFile;
    workImage?: UploadedFile;
    activityCollection?: UploadedFile;
    additionalDoc?: UploadedFile;
  }>({});

  const [activeCompetencyView, setActiveCompetencyView] = useState<string | null>(null);

  // Load existing classroom innovation if exists
  useEffect(() => {
    const existing = classroomInnovations.find(c => c.classroomName === selectedClass);
    if (existing) {
      setInnovationName(existing.innovationName);
      setMemberCount(existing.memberCount);
      setCommittees({ ...existing.committees });
      setBriefDetails(existing.briefDetails);
      setGoals(existing.goals);
      setExpectedBenefits(existing.expectedBenefits);
      setCustomCompetencies({ ...existing.competencies });
      setReporterName(existing.reporterName);
      setClassroomPresident(existing.classroomPresident);
      setFiles({ ...existing.files });
    } else {
      // Clear form
      setInnovationName('');
      setMemberCount(35);
      setCommittees({
        president: '',
        vicePresident: '',
        publicRelations: '',
        treasurer: '',
        secretary: ''
      });
      setBriefDetails('');
      setGoals('');
      setExpectedBenefits('');
      setCustomCompetencies({
        thai: '', math: '', science: '', technology: '', social: '',
        english: '', chinese: '', career: '', health: '', art: '', guidance: ''
      });
      setReporterName(currentUser.name);
      setClassroomPresident('');
      setFiles({});
    }
  }, [selectedClass, classroomInnovations]);

  // Sync reporter name if user changes
  useEffect(() => {
    if (!reporterName) {
      setReporterName(currentUser.name);
    }
  }, [currentUser]);

  // List of classroom choices based on grade
  const mLevel = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'] as const;
  
  const currentGrade = selectedClass.split('/')[0] || 'ม.1';
  const currentRoom = selectedClass.split('/')[1] || '1';

  const maxRoomForCurrentGrade = ['ม.1', 'ม.2', 'ม.3'].includes(currentGrade) ? 8 : 9;
  const availableRooms = Array.from({ length: maxRoomForCurrentGrade }, (_, i) => (i + 1).toString());

  const handleGradeChange = (newGrade: string) => {
    const maxRoom = ['ม.1', 'ม.2', 'ม.3'].includes(newGrade) ? 8 : 9;
    let roomNum = parseInt(currentRoom, 10);
    if (isNaN(roomNum) || roomNum < 1) {
      roomNum = 1;
    } else if (roomNum > maxRoom) {
      roomNum = maxRoom;
    }
    setSelectedClass(`${newGrade}/${roomNum}`);
  };

  const handleRoomChange = (newRoom: string) => {
    setSelectedClass(`${currentGrade}/${newRoom}`);
  };

  // Google Drive & Sheet direct upload handler
  const driveFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [uploadDriveMsg, setUploadDriveMsg] = useState<string | null>(null);
  const [lastUploadedLink, setLastUploadedLink] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle');
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const handleProcessImageUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingToDrive(true);
    setImageUploadStatus('uploading');
    setImageUploadError(null);
    setUploadDriveMsg(null);

    // Create local object URL for instant image preview
    const localObjectUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';

    try {
      let token = getCachedToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (authRes && authRes.accessToken) {
          token = authRes.accessToken;
        }
      }

      if (!token) {
        throw new Error('ไม่พบคีย์ยืนยันสิทธิ์ Google กรุณาลงชื่อเข้าใช้');
      }

      const result = await uploadFileToDriveAndLogToSheet(token, file, {
        classroomName: selectedClass,
        reporterName,
        gradeLevel,
        folderId: '1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL',
        spreadsheetId: '14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg'
      });

      setFiles(prev => ({
        ...prev,
        workImage: {
          name: file.name,
          status: 'success',
          url: result.directUrl || result.webViewLink || localObjectUrl
        }
      }));

      setLastUploadedLink(result.webViewLink);
      setImageUploadStatus('completed');

    } catch (err: any) {
      console.error('Drive/Sheet upload error:', err);
      setImageUploadStatus('error');
      const errText = err?.message || 'ไม่สามารถอัปโหลดได้';
      if (err?.code === 'auth/popup-blocked' || errText.includes('popup-blocked')) {
        setImageUploadError('⚠️ เบราว์เซอร์บล็อกป๊อปอัป กรุณากดอนุญาตแสดงป๊อปอัป Google แล้วลองใหม่อีกครั้ง');
      } else {
        setImageUploadError(`❌ อัปโหลดไปยัง Google Drive ล้มเหลว: ${errText}`);
      }
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleUploadButtonClick = async () => {
    if (!canEdit) {
      alert(`สิทธิ์ผู้บันทึกสามารถอัปโหลดข้อมูลและภาพผลงานได้เฉพาะห้องเรียนตนเอง (${userClassroom}) เท่านั้น`);
      return;
    }
    let token = getCachedToken();
    if (!token) {
      setImageUploadStatus('uploading');
      try {
        const authRes = await googleSignIn();
        if (authRes && authRes.accessToken) {
          token = authRes.accessToken;
        }
      } catch (err: any) {
        console.error('Google Sign-In click error:', err);
        const msg = err?.message || 'โปรดลองอีกครั้ง';
        setImageUploadStatus('error');
        if (err?.code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
          setImageUploadError('⚠️ เบราว์เซอร์บล็อกป๊อปอัป กรุณากดอนุญาตแสดงป๊อปอัป');
        } else {
          setImageUploadError(`⚠️ ลงชื่อเข้าใช้ Google ไม่สำเร็จ: ${msg}`);
        }
        return;
      }
    }

    if (token) {
      driveFileInputRef.current?.click();
    }
  };

  const handleUploadToDriveAndSheet = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    await handleProcessImageUpload(file);
    if (e.target) e.target.value = '';
  };

  const handleImageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingImage) setIsDraggingImage(true);
  };

  const handleImageDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
    if (!canEdit || isUploadingToDrive) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleProcessImageUpload(droppedFile);
    }
  };

  // Real file upload handler
  const handleSimulatedUpload = async (key: keyof typeof files, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      setFiles(prev => ({
        ...prev,
        [key]: {
          name: file.name,
          status: 'uploading',
          url: ''
        }
      }));

      try {
        let token = getCachedToken();
        if (!token) {
          const authRes = await googleSignIn();
          if (authRes && authRes.accessToken) {
            token = authRes.accessToken;
          }
        }

        if (token) {
          const result = await uploadFileToDriveAndLogToSheet(token, file, {
            classroomName: selectedClass,
            reporterName: reporterName || currentUser.name,
            gradeLevel: gradeLevel,
            folderId: TARGET_DRIVE_FOLDER_ID,
            spreadsheetId: TARGET_SPREADSHEET_ID
          });

          setFiles(prev => ({
            ...prev,
            [key]: {
              name: file.name,
              status: 'success',
              url: result.directUrl || result.webViewLink
            }
          }));
        } else {
          const fallbackUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
          setFiles(prev => ({
            ...prev,
            [key]: {
              name: file.name,
              status: 'success',
              url: fallbackUrl
            }
          }));
        }
      } catch (err) {
        console.error('File upload error:', err);
        const fallbackUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
        setFiles(prev => ({
          ...prev,
          [key]: {
            name: file.name,
            status: 'success',
            url: fallbackUrl
          }
        }));
      }
    }
  };

  // Submit handler
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!innovationName.trim()) {
      alert('กรุณากรอกชื่อนวัตกรรม');
      return;
    }

    if (!committees.president.trim() || !committees.vicePresident.trim() || !committees.secretary.trim()) {
      alert('กรุณากรอกคณะกรรมการห้องเรียนให้ครบถ้วน (โดยเฉพาะ ประธาน, รองประธาน, เลขานุการ)');
      return;
    }

    const existingId = classroomInnovations.find(c => c.classroomName === selectedClass)?.id || `class-inn-${Date.now()}`;

    const record: ClassroomInnovation = {
      id: existingId,
      masterId: linkedMaster?.id || 'master-unknown',
      classroomName: selectedClass,
      innovationName,
      memberCount,
      committees,
      briefDetails,
      goals,
      expectedBenefits,
      competencies: customCompetencies,
      reporterName,
      classroomPresident,
      files
    };

    onSave(record);
    onShowSuccess();
  };

  // Permission settings
  const canEdit = isAllAccess || (isRecorder && userClassroom === selectedClass);

  const isImageUploading = isUploadingToDrive || imageUploadStatus === 'uploading';
  const isImageCompleted = (imageUploadStatus === 'completed' || files.workImage?.status === 'success' || Boolean(files.workImage?.url)) && !isImageUploading;

  return (
    <div className="space-y-6">
      
      {/* Classroom Selection Card */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#7D57B2]" />
            ระบบบันทึกนวัตกรรมห้องเรียน
          </h2>
          <p className="text-sm text-[#6A5077] mt-1 font-medium">
            บันทึกรายละเอียด ผลงาน และสมรรถนะนวัตกรรมรายห้องเรียน ดึงฐานข้อมูลแม่แบบอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">ระดับชั้น:</label>
            <select
              value={currentGrade}
              disabled={isRecorder}
              onChange={(e) => handleGradeChange(e.target.value)}
              className="h-11 bg-white border border-gray-200 rounded-xl px-3 text-sm font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] cursor-pointer disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              {isRecorder ? (
                <option value={currentGrade}>{currentGrade}</option>
              ) : (
                mLevel.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">ห้องเรียน:</label>
            <select
              value={currentRoom}
              disabled={isRecorder}
              onChange={(e) => handleRoomChange(e.target.value)}
              className="h-11 bg-white border border-gray-200 rounded-xl px-3 text-sm font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] cursor-pointer disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              {isRecorder ? (
                <option value={currentRoom}>ห้อง {currentRoom}</option>
              ) : (
                availableRooms.map(r => (
                  <option key={r} value={r}>ห้อง {r}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-base text-amber-950">โหมดรับชมข้อมูล (สิทธิ์อ่านอย่างเดียว)</h4>
            <p className="text-xs font-medium text-amber-800 mt-1 leading-relaxed">
              {isRecorder ? (
                <>คุณอยู่ในสถานะ <span className="font-bold">"ผู้บันทึกข้อมูล"</span> สามารถดูข้อมูลได้เท่านั้น!!</>
              ) : (
                <>คุณสามารถดูข้อมูลได้อย่างเดียว ไม่สามารถแก้ไขข้อมูลได้</>
              )}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        {/* ส่วนที่ 1: ข้อมูลที่ดึงมาจากระบบที่ 1 อัตโนมัติ (Auto-populated) */}
        <div className="bg-gradient-to-tr from-[#7D57B2]/5 to-[#E13A9D]/5 rounded-[24px] p-6 md:p-8 border border-purple-100">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* ฝั่งซ้าย: รูปภาพ/กราฟิกประกอบ (Left: Decorative Illustration/Image) */}
            <div className={`md:col-span-4 bg-gradient-to-br ${
              ['ม.1', 'ม.2', 'ม.3'].some(prefix => selectedClass.startsWith(prefix))
                ? 'from-emerald-800 to-emerald-400'
                : 'from-pink-700 to-pink-300'
            } rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden shadow-md min-h-[240px]`}>
              {/* Decorative Background Circles */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 rounded-full blur-lg" />
              
              <div className="z-10">
                <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white/90">
                  Classroom Profile
                </span>
                <h4 className="text-3xl font-black mt-3 font-mono">{selectedClass}</h4>
                <p className="text-xs text-white/80 mt-1 font-medium">โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี</p>
              </div>

              <div className="z-10 mt-auto pt-4 border-t border-white/20">
                <span className="text-[10px] text-white/80 block font-bold uppercase tracking-wider mb-0.5">ภาคเรียน/ปีการศึกษา</span>
                <span className="text-sm md:text-base font-extrabold text-white">
                  {linkedMaster ? `ภาคเรียนที่ ${linkedMaster.semester} / ปีการศึกษา ${linkedMaster.academicYear}` : 'ยังไม่ระบุในระบบ 1'}
                </span>
              </div>
            </div>

            {/* ฝั่งขวา: ข้อมูล ภาคเรียน/ปีการศึกษา ธีมนวัตกรรมสายชั้น รายชื่อครูที่ปรึกษา */}
            <div className="md:col-span-8 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-950 mb-3.5 flex items-center gap-1.5">
                  <BookOpen className="w-5 h-5 text-[#7D57B2]" />
                  ส่วนที่ 1: ข้อมูลระดับชั้น
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-12 bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex flex-col justify-center transition-all duration-200">
                    <span className="text-xs text-gray-400 block font-semibold mb-0.5">ธีมนวัตกรรมสายชั้น</span>
                    <span className="text-lg md:text-xl font-black text-[#7D57B2] block leading-tight">
                      {linkedMaster?.theme || 'ยังไม่ได้กำหนดธีม'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                <span className="text-xs text-[#6A5077] block font-bold mb-1.5">รายชื่อครูที่ปรึกษา</span>
                <div className="flex flex-wrap gap-2.5 mt-1">
                  <span className="bg-[#7D57B2]/10 text-[#7D57B2] font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-[#7D57B2]/20">
                    ครูที่ปรึกษาคนที่ 1: {autoTeachers[0] || '-'}
                  </span>
                  <span className="bg-[#7D57B2]/10 text-[#7D57B2] font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-[#7D57B2]/20">
                    ครูที่ปรึกษาคนที่ 2: {autoTeachers[1] || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ส่วนที่ 2: ข้อมูลพื้นฐานนวัตกรรมห้องเรียน */}
        <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-950">
              ส่วนที่ 2: ข้อมูลนวัตกรรมของห้องเรียน
            </h3>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">ระบุชื่อโครงงาน สมาชิก และกรรมการห้องเรียน</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อผลงานนวัตกรรม</label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="เช่น เครื่องกักเก็บมลพิษอัจฉริยะ 1.0 @BMS"
                value={innovationName}
                onChange={(e) => setInnovationName(e.target.value)}
                className="w-full h-12 px-4 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 font-medium text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">จำนวนสมาชิกห้องเรียน (คน)</label>
              <input
                type="number"
                disabled={!canEdit}
                min={1}
                max={99}
                value={memberCount}
                onChange={(e) => setMemberCount(parseInt(e.target.value) || 30)}
                className="w-full h-12 px-4 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 font-bold"
                required
              />
            </div>
          </div>

          {/* คณะกรรมการห้องเรียน */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-[#E13A9D] mb-4 flex items-center gap-1.5">
              <span>👑</span> คณะกรรมการห้องเรียน
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-purple-50/30 p-5 rounded-2xl border border-purple-100">
              {/* คอลัมน์ที่ 1 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">ประธาน (กรอกข้อมูล ชื่อ-นามสกุล)</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    placeholder="ด.ช. เก่งจริงจัง"
                    value={committees.president}
                    onChange={(e) => setCommittees({ ...committees, president: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E13A9D] disabled:bg-gray-50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">รองประธาน (กรอกข้อมูล ชื่อ-นามสกุล)</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    placeholder="ด.ญ. แสนดีมาก"
                    value={committees.vicePresident}
                    onChange={(e) => setCommittees({ ...committees, vicePresident: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E13A9D] disabled:bg-gray-50 font-medium"
                  />
                </div>
              </div>

              {/* คอลัมน์ที่ 2 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">ประชาสัมพันธ์ (กรอกข้อมูล ชื่อ-นามสกุล)</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    placeholder="ด.ช. ปากกว้าง"
                    value={committees.publicRelations}
                    onChange={(e) => setCommittees({ ...committees, publicRelations: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E13A9D] disabled:bg-gray-50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">เหรัญญิก (กรอกข้อมูล ชื่อ-นามสกุล)</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    placeholder="ด.ญ. คิดเงินเก่ง"
                    value={committees.treasurer}
                    onChange={(e) => setCommittees({ ...committees, treasurer: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E13A9D] disabled:bg-gray-50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">เลขานุการ (กรอกข้อมูล ชื่อ-นามสกุล)</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    placeholder="ด.ญ. ละเอียดรอบคอบ"
                    value={committees.secretary}
                    onChange={(e) => setCommittees({ ...committees, secretary: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E13A9D] disabled:bg-gray-50 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* รายละเอียดเนื้อหาเชิงพรรณนา */}
          <div className="mt-8 grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">รายละเอียดนวัตกรรมโดยย่อ</label>
              <textarea
                disabled={!canEdit}
                rows={3}
                placeholder="ระบุที่มา ความสำคัญ ขอบข่ายนวัตกรรม และภาพรวมการประยุกต์ใช้งาน..."
                value={briefDetails}
                onChange={(e) => setBriefDetails(e.target.value)}
                className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">จุดประสงค์นวัตกรรม</label>
                <textarea
                  disabled={!canEdit}
                  rows={3}
                  placeholder="1. เพื่อพัฒนา...\n2. เพื่อศึกษา..."
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ประโยชน์ที่คาดว่าจะได้รับ</label>
                <textarea
                  disabled={!canEdit}
                  rows={3}
                  placeholder="1. สมาชิกมีความตระหนักและ...\n2. ลดปัญหา..."
                  value={expectedBenefits}
                  onChange={(e) => setExpectedBenefits(e.target.value)}
                  className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* สมรรถนะ */}
        <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-950">
              ส่วนที่ 3: รายละเอียดตามฐานสมรรถนะนวัตกรรมรายกลุ่มสาระฯ
            </h3>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">กดปุ่มดูเกณฑ์อ้างอิงสายชั้น และกรอกความเชื่อมโยงเฉพาะของห้องเรียนท่าน</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {[
              { key: 'thai', label: '1. สมรรถนะภาษาไทย' },
              { key: 'math', label: '2. สมรรถนะคณิตศาสตร์' },
              { key: 'science', label: '3. สมรรถนะวิทยาศาสตร์และเทคโนโลยี' },
              { key: 'technology', label: '4. สมรรถนะเทคโนโลยี (วิทยาศาสตร์และเทคโนโลยี)' },
              { key: 'social', label: '5. สมรรถนะสังคมศึกษา ศาสนาและวัฒนธรรม' },
              { key: 'english', label: '6. สมรรถนะภาษาต่างประเทศ (อังกฤษ)' },
              { key: 'chinese', label: '7. สมรรถนะภาษาต่างประเทศ (จีน)' },
              { key: 'career', label: '8. สมรรถนะการงานอาชีพ' },
              { key: 'health', label: '9. สมรรถนะสุขศึกษาและพลศึกษา' },
              { key: 'art', label: '10. สมรรถนะศิลปะ' },
              { key: 'guidance', label: '11. สมรรถนะด้านแนะแนว' },
            ].map((comp) => {
              const templateText = linkedMaster?.competencies 
                ? (linkedMaster.competencies as any)[comp.key] 
                : 'ยังไม่ได้รับการบันทึกเกณฑ์สมรรถนะอ้างอิงของระดับชั้นนี้ในระบบ 1';
                
              const isViewingTemplate = activeCompetencyView === comp.key;

              return (
                <div key={comp.key} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                    <span className="text-base font-semibold text-gray-800">{comp.label}</span>
                    
                    <button
                      type="button"
                      onClick={() => setActiveCompetencyView(isViewingTemplate ? null : comp.key)}
                      className="text-xs bg-[#7D57B2]/10 hover:bg-[#7D57B2]/15 text-[#7D57B2] font-semibold px-3 py-1.5 rounded-xl border border-[#7D57B2]/20 flex items-center gap-1 self-start sm:self-auto transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isViewingTemplate ? 'ปิดดูเกณฑ์แม่แบบ' : 'ดูเกณฑ์แม่แบบระดับชั้น'}
                    </button>
                  </div>

                  {isViewingTemplate && (
                    <div className="bg-purple-50 text-purple-950 p-3.5 rounded-xl text-sm font-medium mb-3 border border-purple-100 flex gap-2 animate-fadeIn">
                      <Info className="w-4 h-4 text-[#7D57B2] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-xs text-[#7D57B2] uppercase font-bold tracking-wider mb-1">เกณฑ์สมรรถนะแม่แบบระดับชั้น ({gradeLevel}):</strong>
                        {templateText}
                      </div>
                    </div>
                  )}

                  <textarea
                    disabled={!canEdit}
                    rows={2}
                    value={(customCompetencies as any)[comp.key]}
                    onChange={(e) => setCustomCompetencies({ ...customCompetencies, [comp.key]: e.target.value })}
                    placeholder={`ระบุพรรณนาเชิงลึกด้าน${comp.label.replace(/^\d+\.\s+สมรรถนะ/, '')} ของห้องเรียนนี้โดยเฉพาะ...`}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                    required
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อครูผู้รายงานข้อมูล</label>
              <input
                type="text"
                disabled={!canEdit}
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full h-11 px-4 bg-white rounded-xl border border-gray-200 focus:outline-none font-medium disabled:bg-gray-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อประธานนวัตกรรมห้องเรียน (ลงนามบันทึก)</label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="เช่น นายอภิชาติ ประสบผล"
                value={classroomPresident}
                onChange={(e) => setClassroomPresident(e.target.value)}
                className="w-full h-11 px-4 bg-white rounded-xl border border-gray-200 focus:outline-none font-medium disabled:bg-gray-50"
                required
              />
            </div>
          </div>
        </div>

        {/* ส่วนที่ 4: การจัดส่งไฟล์นวัตกรรม และหลักฐานประกอบ */}
        <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h3 className="text-xl font-bold text-gray-950">
              ส่วนที่ 4: การจัดส่งไฟล์นวัตกรรม และหลักฐานประกอบ
            </h3>
            <p className="text-sm text-gray-600 mt-0.5 font-medium">
              แนบเอกสารเพื่อส่งไปยังโฟลเดอร์ Google Drive ปลายทางที่กำหนดไว้ในระบบแอดมิน
            </p>
          </div>



          {/* ส่วนของภาพผลงานนวัตกรรม (Upload Box supporting Click & Drag and Drop) */}
          <div
            onClick={canEdit ? handleUploadButtonClick : () => alert(`สิทธิ์ผู้บันทึกสามารถอัปโหลดข้อมูลและภาพผลงานได้เฉพาะห้องเรียนตนเอง (${userClassroom}) เท่านั้น`)}
            onDragOver={handleImageDragOver}
            onDragLeave={handleImageDragLeave}
            onDrop={handleImageDrop}
            className={`p-6 rounded-2xl transition duration-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 mb-6 border-2 ${
              !canEdit
                ? 'border-gray-200 bg-gray-50/60 cursor-not-allowed opacity-80'
                : isDraggingImage
                ? 'border-purple-500 bg-purple-50 scale-[1.01] cursor-pointer'
                : isImageUploading
                ? 'border-dashed border-red-400 bg-red-50/40 cursor-pointer'
                : isImageCompleted
                ? 'border-solid border-emerald-300 bg-emerald-50/20 cursor-pointer'
                : 'border-dashed border-gray-300 bg-gradient-to-r from-[#F5F4F7] to-white hover:border-[#7D57B2] hover:bg-purple-50/20 cursor-pointer'
            }`}
          >
            <div className="space-y-1 text-center md:text-left flex-1 min-w-0">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-2 justify-center md:justify-start">
                <h4 className="text-base font-bold text-gray-950">
                  ภาพผลงานนวัตกรรม (ไฟล์รูปภาพ JPG/JPEG/PNG)
                </h4>
                <span className="text-[10px] font-bold text-[#7D57B2] bg-[#7D57B2]/10 px-2.5 py-1 rounded-full shrink-0">
                  คลิก หรือ ลากรูปภาพมาวางที่นี่
                </span>
              </div>
              <p className="text-xs text-[#6A5077] font-medium leading-relaxed">
                คลิกเพื่อเลือกรูปภาพ หรือลากไฟล์รูปภาพมาวางที่ช่องนี้เพื่ออัปโหลดไปยัง Google Drive
              </p>

              {/* Status Display Area */}
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                {/* 1. Uploading status: Red blinking upload icon + Red text " กำลัง Upload " without clutter */}
                {isImageUploading && (
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 font-black text-sm shadow-sm">
                    <Upload className="w-5 h-5 text-red-600 animate-bounce shrink-0" />
                    <span className="animate-pulse text-red-600 font-black"> กำลัง Upload </span>
                  </div>
                )}

                {/* 2. Completed status: Vibrant green badge "Upload สมบูรณ์" with checkmark icon */}
                {isImageCompleted && (
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-800 font-extrabold text-sm shadow-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-800 font-bold">Upload สมบูรณ์</span>
                  </div>
                )}

                {/* Error status */}
                {imageUploadError && !isImageUploading && (
                  <div className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                    {imageUploadError}
                  </div>
                )}
              </div>

              {/* Preview of the uploaded image */}
              {files.workImage?.url && (
                <div className="mt-3.5 flex items-center gap-3.5 bg-white p-3 rounded-2xl border border-emerald-200 shadow-md w-fit mx-auto md:mx-0">
                  <div className="w-28 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm shrink-0 bg-gray-50 flex items-center justify-center">
                    <img src={files.workImage.url} alt="Work Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-xs font-extrabold text-gray-900 block truncate max-w-[220px]" title={files.workImage.name}>
                      {files.workImage.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Upload สมบูรณ์
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0 w-full md:w-auto">
              <input
                type="file"
                ref={driveFileInputRef}
                disabled={!canEdit || isUploadingToDrive}
                className="hidden"
                accept="image/*"
                onChange={handleUploadToDriveAndSheet}
              />

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <button
                  type="button"
                  disabled={!canEdit || isUploadingToDrive}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUploadButtonClick();
                  }}
                  className={`h-12 px-8 w-full md:w-auto font-black text-sm rounded-xl shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 ${
                    isImageUploading
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : isImageCompleted
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-gradient-to-r from-[#7D57B2] to-[#E13A9D] hover:from-[#6b48a0] hover:to-[#ce2989] text-white'
                  }`}
                >
                  {isImageUploading ? (
                    <>
                      <Upload className="w-5 h-5 text-white animate-bounce shrink-0" />
                      <span className="animate-pulse text-white font-black"> กำลัง Upload </span>
                    </>
                  ) : isImageCompleted ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-white shrink-0" />
                      <span>Upload สมบูรณ์</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 animate-bounce-slow shrink-0" />
                      <span>อัปโหลดรูปภาพ ↗</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* คำแนะนำในการจัดส่งไฟล์หลักฐานประกอบ (ย้ายมาไว้ ส่วนที่ 4 และปรับขนาดอักษรเพิ่มขึ้น +1) */}
          <div className="mt-8 p-5 rounded-2xl bg-[#E13A9D]/5 border border-[#E13A9D]/10 flex items-start gap-3.5 shadow-sm">
            <Info className="w-7 h-7 text-[#E13A9D] shrink-0 mt-0.5" />
            <div className="text-sm text-[#6A5077] leading-relaxed font-medium">
              <span className="font-extrabold block text-base text-[#E13A9D] mb-1.5">📌 คำแนะนำในการจัดส่งไฟล์หลักฐานประกอบ:</span>
              <ul className="list-disc list-inside space-y-2">
                <li><strong className="text-gray-950 text-sm">Flowchart ขั้นตอนนวัตกรรม (ไฟล์ PDF):</strong> แสดงแผนภาพกระบวนการเชิงระบบขับเคลื่อนนวัตกรรม (ใช้ภาพสัญลักษณ์ flowchart)</li>
                <li><strong className="text-gray-950 text-sm">แผ่นพับประชาสัมพันธ์โครงงาน (ไฟล์ PDF):</strong> แผ่นพับประชาสัมพันธ์สรุปใจความและผลสำเร็จของโครงการ (ใช้ภาพสัญลักษณ์ brochure)</li>
                <li><strong className="text-gray-950 text-sm">ภาพผลงานนวัตกรรม (ไฟล์รูปภาพ JPG/JPEG/PNG):</strong> แนบภาพประกอบรายงานนวัตกรรมจัดเรียงในขนาด 1 หน้า A4 และบันทึกเป็นไฟล์รูปภาพเด่น (ใช้ภาพสัญลักษณ์ ภาพผลงานนวัตกรรม)</li>
                <li><strong className="text-gray-950 text-sm">ประมวลภาพรวมกิจกรรม (ไฟล์รูปภาพ JPG/JPEG/PNG):</strong> รวบรวมภาพกิจกรรมการทำงานตั้งแต่เริ่มต้นกระบวนการจนถึงวันนำเสนอจริง (ใช้ภาพสัญลักษณ์ภาพถ่าย)</li>
              </ul>
            </div>
          </div>

          {/* ปุ่มอัปโหลดไฟล์ เชื่อมโยง Google Drive รายห้องเรียน (Classroom Data Links) */}
          {(() => {
            const classroomLinkObj = adminSettings?.googleDriveLinks?.find(
              lnk => lnk.gradeLevel === currentGrade && lnk.room === currentRoom
            );
            const classroomDriveUrl = classroomLinkObj?.link || 'https://drive.google.com';
            const hasConfiguredLink = !!classroomLinkObj?.link;

            return (
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-[#F5F4F7] to-white border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-center md:text-left flex-1 min-w-0">
                  <h4 className="text-base font-bold text-gray-950">
                    จัดส่งไฟล์หลักฐานนวัตกรรมสำหรับ ห้องเรียน {selectedClass}
                  </h4>
                  <p className="text-xs text-[#6A5077] font-medium leading-relaxed">
                    คลิกปุ่มอัปโหลดเพื่อเปิดลิงก์ไปยัง Google Drive ปลายทางของห้องเรียน {selectedClass} ที่กำหนดไว้ในระบบแอดมิน
                  </p>
                  {classroomLinkObj?.note && (
                    <p className="text-[11px] text-gray-500 italic mt-0.5">
                      หมายเหตุ: {classroomLinkObj.note}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1.5 shrink-0 w-full md:w-auto">
                  <a
                    href={canEdit ? classroomDriveUrl : '#'}
                    target={canEdit ? "_blank" : "_self"}
                    onClick={(e) => {
                      if (!canEdit) {
                        e.preventDefault();
                        alert(`สิทธิ์ผู้บันทึกสามารถจัดส่งไฟล์หลักฐานได้เฉพาะห้องเรียนตนเอง (${userClassroom}) เท่านั้น`);
                      }
                    }}
                    className={`h-12 px-8 w-full md:w-auto font-black text-sm rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-2 ${
                      canEdit
                        ? 'bg-gradient-to-r from-[#7D57B2] to-[#E13A9D] hover:from-[#6b48a0] hover:to-[#ce2989] text-white hover:shadow-lg'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Upload className="w-5 h-5 animate-bounce-slow" />
                    <span>อัปโหลดไฟล์ (Upload Google Drive) ↗</span>
                  </a>
                  {hasConfiguredLink ? (
                    <span className="text-[11px] text-[#7D57B2] font-bold">
                      Google Drive ห้องเรียน {selectedClass}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/40">
                      ⚠️ ยังไม่ได้ระบุลิงก์ห้องเรียนในระบบแอดมิน (เปิดหน้าแรก Google Drive)
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Save Classroom Innovation Button */}
        {canEdit && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="h-[48px] px-8 bg-gradient-to-r from-[#7D57B2] to-[#E13A9D] hover:from-[#6b48a0] hover:to-[#ce2989] text-white font-semibold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              บันทึกข้อมูลนวัตกรรมห้องเรียน ({selectedClass})
            </button>
          </div>
        )}

      </form>
    </div>
  );
};
