import React, { useState, useEffect, useRef } from 'react';
import { PLCActivity, AppUser } from '../types';
import { Plus, Trash2, Save, FileText, Calendar, Clock, MapPin, Upload, Image, HelpCircle, ShieldAlert, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { uploadFileToDriveAndLogToSheet, getCachedToken, googleSignIn } from '../lib/sheetsService';

interface System2PLCProps {
  currentUser: AppUser;
  plcActivities: PLCActivity[];
  onSave: (record: PLCActivity) => void;
  onDelete?: (id: string) => void;
  onShowSuccess: () => void;
}

interface PLCImageSlot {
  url: string;
  name: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  statusText?: string;
}

export const System2PLC: React.FC<System2PLCProps> = ({
  currentUser,
  plcActivities,
  onSave,
  onDelete,
  onShowSuccess
}) => {
  const isAllAccess = currentUser.role === 'Admin';
  const isCommittee = currentUser.role === 'Committee';
  const userGrade = currentUser.assignedGrade || 'ม.1';

  // Grade level filter state - defaults to user's grade if Committee, or 'all' if Admin
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>(() => {
    return isCommittee ? userGrade : 'all';
  });

  // State to toggle between view list and adding/editing a record
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<PLCActivity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<PLCActivity | null>(null);

  // Form states
  const [gradeLevel, setGradeLevel] = useState<'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'>('ม.1');
  const [academicYear, setAcademicYear] = useState<number>(2569);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [groupName, setGroupName] = useState('');
  const [times, setTimes] = useState<number>(1);
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [durationHours, setDurationHours] = useState<number>(2);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  
  // Participants
  const [plcLeader, setPlcLeader] = useState('');
  const [expertRole1, setExpertRole1] = useState(''); // ครูผู้สอน
  const [expertRole2, setExpertRole2] = useState(''); // ครูร่วมเรียนรู้
  const [expertRole3, setExpertRole3] = useState(''); // ผู้เชี่ยวชาญ
  const [expertRole4, setExpertRole4] = useState(''); // ฝ่ายวิชาการ
  const [otherParticipants, setOtherParticipants] = useState('-');

  // Narrative
  const [procedures, setProcedures] = useState('');
  const [results, setResults] = useState('');
  const [suggestions, setSuggestions] = useState('');

  // 4 Single-Image Upload Slots State
  const [imageSlots, setImageSlots] = useState<PLCImageSlot[]>([
    { url: '', name: '', status: 'idle' },
    { url: '', name: '', status: 'idle' },
    { url: '', name: '', status: 'idle' },
    { url: '', name: '', status: 'idle' }
  ]);

  const slot0Ref = useRef<HTMLInputElement | null>(null);
  const slot1Ref = useRef<HTMLInputElement | null>(null);
  const slot2Ref = useRef<HTMLInputElement | null>(null);
  const slot3Ref = useRef<HTMLInputElement | null>(null);
  const slotRefs = [slot0Ref, slot1Ref, slot2Ref, slot3Ref];

  // Signatures / Certification
  const [recorderName, setRecorderName] = useState('');
  const [certifiedName, setCertifiedName] = useState('ดร.สมชาย ใจงาม (ผู้อำนวยการ)');

  // Set default values depending on active user
  useEffect(() => {
    if (isCommittee) {
      setGradeLevel(userGrade as any);
    }
  }, [isCommittee, userGrade]);

  // Handle open form for new activity
  const handleOpenNew = () => {
    setEditingActivity(null);
    setGroupName(isCommittee ? `กลุ่ม PLC มัธยมศึกษาปีที่ ${userGrade.replace('ม.', '')}` : '');
    setTimes(1);
    setDate(new Date().toISOString().split('T')[0]);
    setLocation('ห้องพักครูระดับชั้น');
    setDurationHours(2);
    setDurationMinutes(0);
    setPlcLeader(currentUser.name);
    setExpertRole1('—');
    setExpertRole2('—');
    setExpertRole3('—');
    setExpertRole4('—');
    setOtherParticipants('—');
    setProcedures('');
    setResults('');
    setSuggestions('');
    setImageSlots([
      { url: '', name: '', status: 'idle' },
      { url: '', name: '', status: 'idle' },
      { url: '', name: '', status: 'idle' },
      { url: '', name: '', status: 'idle' }
    ]);
    setRecorderName(currentUser.name);
    setIsFormOpen(true);
  };

  // Handle edit activity
  const handleEdit = (activity: PLCActivity) => {
    setEditingActivity(activity);
    setGradeLevel(activity.gradeLevel);
    setAcademicYear(activity.academicYear);
    setSemester(activity.semester);
    setGroupName(activity.groupName);
    setTimes(activity.times);
    setDate(activity.date);
    setLocation(activity.location);
    setDurationHours(activity.durationHours);
    setDurationMinutes(activity.durationMinutes);
    setPlcLeader(activity.plcLeader);
    setExpertRole1(activity.expertRole1);
    setExpertRole2(activity.expertRole2);
    setExpertRole3(activity.expertRole3);
    setExpertRole4(activity.expertRole4);
    setOtherParticipants(activity.otherParticipants);
    setProcedures(activity.procedures);
    setResults(activity.results);
    setSuggestions(activity.suggestions);

    const imgs = activity.images || [];
    setImageSlots([0, 1, 2, 3].map((idx) => ({
      url: imgs[idx] || '',
      name: imgs[idx] ? `ภาพที่ ${idx + 1}` : '',
      status: imgs[idx] ? 'success' : 'idle',
      statusText: imgs[idx] ? 'อัปโหลดลง Drive สำเร็จ' : ''
    })));

    setRecorderName(activity.recorderName);
    setCertifiedName(activity.certifiedName);
    setIsFormOpen(true);
  };

  const compressImage = (file: File, maxW: number = 600, maxH: number = 600, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
          } else {
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(reader.result as string);
          }
        };
        img.onerror = () => {
          resolve(reader.result as string);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
    });
  };

  // Upload single image for a specific slot index (0, 1, 2, 3)
  const handleSingleSlotUpload = async (slotIndex: number, file: File) => {
    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = {
        url: next[slotIndex]?.url || '',
        name: file.name,
        status: 'uploading',
        statusText: 'กำลังขอสิทธิ์เข้าสู่ระบบ Google และอัปโหลดไปยัง Google Drive...'
      };
      return next;
    });

    try {
      // 1. Get Google Access Token first before async delays to preserve gesture tick if needed
      let token = getCachedToken();
      if (!token) {
        try {
          const authRes = await googleSignIn();
          if (authRes?.accessToken) {
            token = authRes.accessToken;
          }
        } catch (authErr: any) {
          console.warn('Google Sign-In failed or popup blocked:', authErr);
          const isBlocked = authErr?.code === 'auth/popup-blocked' || authErr?.message?.includes('popup-blocked');
          const errText = isBlocked
            ? '⚠️ ป๊อปอัปถูกบล็อก กรุณากดปุ่ม "เข้าสู่ระบบ Google" สีเขียวด้านบนเพื่อขอสิทธิ์อัปโหลด'
            : '⚠️ ยังไม่ได้ยืนยันเข้าสู่ระบบ Google กรุณากดปุ่ม "เข้าสู่ระบบ Google" ด้านบนเพื่อเปิดสิทธิ์ Google Drive';

          setImageSlots((prev) => {
            const next = [...prev];
            next[slotIndex] = {
              url: next[slotIndex]?.url || '',
              name: file.name,
              status: 'error',
              statusText: errText
            };
            return next;
          });
          return;
        }
      }

      if (!token) {
        throw new Error('ไม่พบคีย์ยืนยันสิทธิ์ Google กรุณากดปุ่มเข้าสู่ระบบ Google เพื่อยืนยันสิทธิ์');
      }

      // 2. Compress image for preview
      const localUrl = await compressImage(file, 600, 600, 0.6);

      // 3. Upload file to Google Drive (folder ID: 1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL) and log to Sheet (ID: 14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg)
      const uploadRes = await uploadFileToDriveAndLogToSheet(token, file, {
        classroomName: `กิจกรรม PLC สายชั้น ${gradeLevel} (ครั้งที่ ${times})`,
        reporterName: recorderName || currentUser.name,
        gradeLevel: gradeLevel,
        folderId: '1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL',
        spreadsheetId: '14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg'
      });

      const finalUrl = uploadRes.directUrl || uploadRes.webViewLink || localUrl;

      setImageSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = {
          url: finalUrl,
          name: file.name,
          status: 'success',
          statusText: 'อัปโหลดลง Google Drive ID: 1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL & Sheet สำเร็จ!'
        };
        return next;
      });

    } catch (err: any) {
      console.error(`Slot ${slotIndex + 1} upload failed:`, err);
      setImageSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = {
          url: next[slotIndex]?.url || '',
          name: file.name,
          status: 'error',
          statusText: err?.message || 'เกิดข้อผิดพลาดในการอัปโหลดไปยัง Google Drive'
        };
        return next;
      });
    }
  };

  const [removingSlotIdx, setRemovingSlotIdx] = useState<number | null>(null);

  const handleRemoveSlotImage = (slotIndex: number) => {
    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = { url: '', name: '', status: 'idle' };
      return next;
    });
    setRemovingSlotIdx(null);
  };

  // Submit activity
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      alert('กรุณากรอกชื่อกลุ่มกิจกรรม');
      return;
    }

    if (times < 1 || times > 99) {
      alert('กรุณากรอกครั้งที่ของกิจกรรม (ไม่เกิน 2 หลัก)');
      return;
    }

    const activityImages = imageSlots.map((s) => s.url).filter(Boolean);

    const activityData: PLCActivity = {
      id: editingActivity?.id || `plc-${Date.now()}`,
      gradeLevel,
      semester,
      academicYear,
      groupName,
      times,
      date,
      location,
      durationHours,
      durationMinutes,
      plcLeader,
      expertRole1,
      expertRole2,
      expertRole3,
      expertRole4,
      otherParticipants,
      procedures,
      results,
      suggestions,
      images: activityImages,
      recorderName,
      certifiedName,
      signatures: editingActivity?.signatures || {}
    };

    onSave(activityData);
    onShowSuccess();
  };

  // Render lists of activities filtered by the selected dropdown grade filter
  const visibleActivities = plcActivities.filter(act => {
    if (selectedGradeFilter === 'all') return true;
    return act.gradeLevel === selectedGradeFilter;
  });

  const canEdit = (level: string) => {
    return isAllAccess || (isCommittee && userGrade === level);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#7D57B2]" />
            ระบบบันทึกกิจกรรม PLC
          </h2>
          <p className="text-sm text-[#6A5077] mt-1 font-medium">
            บันทึกรายงานกิจกรรมชุมชนแห่งการเรียนรู้ (PLC) ประจำระดับชั้นและขั้นตอนการทำงาน
          </p>
        </div>

        {!isFormOpen && (
          <button
            type="button"
            onClick={handleOpenNew}
            disabled={!isAllAccess && !isCommittee}
            className="h-12 px-6 bg-[#E13A9D] hover:bg-[#ce2989] text-white font-semibold rounded-2xl transition shadow-md flex items-center gap-2 self-start md:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            เพิ่มบันทึกกิจกรรม PLC ใหม่
          </button>
        )}

        {isFormOpen && (
          <button
            type="button"
            onClick={() => setIsFormOpen(false)}
            className="h-12 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl transition"
          >
            ย้อนกลับไปตารางกิจกรรม
          </button>
        )}
      </div>

      {!isFormOpen ? (
        /* LIST OF ACTIVITIES VIEW */
        <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-950">
                ตารางบันทึกกิจกรรม PLC
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">แสดงประวัติกิจกรรมและสรุปชั่วโมงดำเนินงานแยกตามระดับชั้น</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700 whitespace-nowrap">ระดับชั้น:</span>
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] cursor-pointer"
                >
                  <option value="all">แสดงทุกระดับชั้น</option>
                  <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                  <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                  <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
                  <option value="ม.4">มัธยมศึกษาปีที่ 4</option>
                  <option value="ม.5">มัธยมศึกษาปีที่ 5</option>
                  <option value="ม.6">มัธยมศึกษาปีที่ 6</option>
                </select>
              </div>
              <span className="text-xs font-bold text-[#E13A9D] bg-[#E13A9D]/10 px-3 py-1.5 rounded-full">
                รวมทั้งหมด {visibleActivities.length} กิจกรรม
              </span>
            </div>
          </div>

          {(() => {
            const isJuniorGrade = (g: string) => ['ม.1', 'ม.2', 'ม.3'].includes(g);
            let headerClass = 'bg-gradient-to-r from-emerald-800 to-pink-700 text-white';
            let borderClass = 'border-slate-200';
            
            if (selectedGradeFilter !== 'all') {
              if (isJuniorGrade(selectedGradeFilter)) {
                headerClass = 'bg-emerald-800 text-white';
                borderClass = 'border-emerald-200';
              } else {
                headerClass = 'bg-pink-700 text-white';
                borderClass = 'border-pink-200';
              }
            }

            return (
              <div className={`overflow-x-auto border ${borderClass} rounded-2xl shadow-sm`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`${headerClass} text-xs md:text-sm uppercase font-bold tracking-wider`}>
                      <th className="px-6 py-4 rounded-tl-2xl">ครั้งที่</th>
                      <th className="px-6 py-4">กลุ่มกิจกรรม</th>
                      <th className="px-6 py-4">จำนวนชั่วโมง</th>
                      <th className="px-6 py-4 text-center rounded-tr-2xl">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white text-sm font-medium">
                    {visibleActivities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 bg-gray-50 font-medium">
                          ไม่มีประวัติบันทึกกิจกรรม PLC ในระดับชั้นนี้
                        </td>
                      </tr>
                    ) : (
                      visibleActivities.map((act) => {
                        const editable = canEdit(act.gradeLevel);
                        const isRowJunior = isJuniorGrade(act.gradeLevel);
                        const rowBgClass = isRowJunior 
                          ? 'bg-emerald-50/70 hover:bg-emerald-100/90 text-slate-800' 
                          : 'bg-pink-50/70 hover:bg-pink-100/90 text-slate-800';
                        const textAccent = isRowJunior ? 'text-emerald-700' : 'text-pink-600';
                        const badgeBg = isRowJunior ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800';
                        const btnClass = isRowJunior
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-700 hover:text-white border border-emerald-200'
                          : 'text-pink-700 bg-pink-50 hover:bg-pink-700 hover:text-white border border-pink-200';

                        return (
                          <tr key={act.id} className={`${rowBgClass} transition-colors`}>
                            <td className={`px-6 py-4 font-mono font-bold ${textAccent}`}>ครั้งที่ {act.times}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-950">{act.groupName}</div>
                              <div className={`text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded ${badgeBg}`}>ระดับชั้น {act.gradeLevel}</div>
                            </td>
                            <td className="px-6 py-4 font-mono">
                              {act.durationHours} ชม. {act.durationMinutes} นาที
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(act)}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all duration-200 ${btnClass}`}
                                >
                                  {editable ? 'แก้ไข/บันทึก' : 'ดูรายละเอียด'}
                                </button>
                                {editable && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingActivity(act)}
                                    className="text-rose-600 hover:text-white text-xs font-bold bg-rose-50 hover:bg-rose-600 p-2 rounded-xl transition-all duration-200 border border-rose-100"
                                    title="ลบข้อมูลกิจกรรมครั้งนี้"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      ) : (
        /* ADD / EDIT FORM VIEW */
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Validation warning if user can't write to this level */}
          {!canEdit(gradeLevel) ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-6 flex gap-4 items-start">
              <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-lg">สิทธิ์อ่านอย่างเดียว</h4>
                <p className="text-sm text-amber-800 mt-1">
                  คุณไม่มีสิทธิ์แก้ไขกิจกรรม PLC ของสายชั้น {gradeLevel} เนื่องจากคุณไม่ใช่กรรมการสายชั้นนี้ หรือไม่ใช่ผู้ดูแลระบบ
                </p>
              </div>
            </div>
          ) : null}

          {/* ส่วนที่ 1: บันทึกการทำกิจกรรมของระดับชั้น */}
          <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="border-b border-gray-100 pb-4 mb-6">
              <h3 className="text-xl font-semibold text-gray-950">
                ส่วนที่ 1: รายละเอียดกลุ่มกิจกรรม PLC และกำหนดเวลา
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 font-medium">บันทึกกลุ่มกิจกรรมและรายชื่อบุคลากรผู้เข้าร่วม</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ระดับชั้นสายเรียน</label>
                <select
                  disabled={!isAllAccess}
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value as any)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 disabled:text-gray-500 font-medium"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">ปีการศึกษา</label>
                <input
                  type="number"
                  disabled={!canEdit(gradeLevel)}
                  value={academicYear}
                  onChange={(e) => setAcademicYear(parseInt(e.target.value) || 2569)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ภาคเรียนที่</label>
                <select
                  disabled={!canEdit(gradeLevel)}
                  value={semester}
                  onChange={(e) => setSemester(parseInt(e.target.value) as any)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 font-medium"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อกลุ่มกิจกรรม PLC</label>
                <input
                  type="text"
                  disabled={!canEdit(gradeLevel)}
                  placeholder="เช่น กลุ่มย่อยบูรณาการเกษตรอินทรีย์ ม.1"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ครั้งที่ (ตัวเลขไม่เกิน 2 หลัก)</label>
                <input
                  type="number"
                  disabled={!canEdit(gradeLevel)}
                  min={1}
                  max={99}
                  value={times}
                  onChange={(e) => setTimes(parseInt(e.target.value) || 1)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">วันที่ดำเนินกิจกรรม</label>
                <div className="relative">
                  <input
                    type="date"
                    disabled={!canEdit(gradeLevel)}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 font-medium"
                    required
                  />
                  <Calendar className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">สถานที่ดำเนินกิจกรรม</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!canEdit(gradeLevel)}
                    placeholder="เช่น ห้องประชุมสุนทรภู่ อาคาร 3"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 font-medium"
                    required
                  />
                  <MapPin className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">เวลาทำกิจกรรม (ชั่วโมง)</label>
                <div className="relative">
                  <input
                    type="number"
                    disabled={!canEdit(gradeLevel)}
                    min={0}
                    max={24}
                    value={durationHours}
                    onChange={(e) => { const v = parseInt(e.target.value); setDurationHours(isNaN(v) ? 0 : v); }}
                    className="w-full h-12 pl-11 pr-4 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 font-medium"
                    required
                  />
                  <Clock className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">เวลาทำกิจกรรม (นาที)</label>
                <input
                  type="number"
                  disabled={!canEdit(gradeLevel)}
                  min={0}
                  max={60}
                  value={durationMinutes}
                  onChange={(e) => { const v = parseInt(e.target.value); setDurationMinutes(isNaN(v) ? 0 : v); }}
                  className="w-full h-12 px-4 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 font-medium"
                  required
                />
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-lg font-semibold text-[#7D57B2] mb-4 flex items-center gap-1.5">
                <span>👥</span> บทบาทและการมีส่วนร่วม
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ครูผู้สอน (Model Teacher)</label>
                  <input
                    type="text"
                    disabled={!canEdit(gradeLevel)}
                    value={expertRole1}
                    onChange={(e) => setExpertRole1(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                    placeholder="หากไม่มีกรอก -"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ครูร่วมเรียนรู้ (Buddy Teacher)</label>
                  <input
                    type="text"
                    disabled={!canEdit(gradeLevel)}
                    value={expertRole2}
                    onChange={(e) => setExpertRole2(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                    placeholder="หากไม่มีกรอก -"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ผู้เชี่ยวชาญ (Expert)</label>
                  <input
                    type="text"
                    disabled={!canEdit(gradeLevel)}
                    value={expertRole3}
                    onChange={(e) => setExpertRole3(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                    placeholder="หากไม่มีกรอก -"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ฝ่ายวิชาการ / หัวหน้าสายชั้น / หัวหน้ากลุ่มสาระฯ</label>
                  <input
                    type="text"
                    disabled={!canEdit(gradeLevel)}
                    value={expertRole4}
                    onChange={(e) => setExpertRole4(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                    placeholder="หากไม่มีกรอก -"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ส่วนที่ 2 : ขั้นตอนการดำเนินงาน */}
          <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="border-b border-gray-100 pb-4 mb-6">
              <h3 className="text-xl font-semibold text-gray-950">
                ส่วนที่ 2: ขั้นตอนการดำเนินงาน และหลักฐานอ้างอิง
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 font-medium">บันทึกเนื้อหาเชิงพรรณนา พร้อมอัปโหลดภาพกิจกรรมสูงสุด 4 ภาพ</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ขั้นตอนการดำเนินงาน (พิมพ์หลายบรรทัดได้)</label>
                <textarea
                  disabled={!canEdit(gradeLevel)}
                  rows={4}
                  placeholder="รายละเอียดหัวข้อหารือ แนวทางแก้ไข และข้อสรุปทางวิชาการ..."
                  value={procedures}
                  onChange={(e) => setProcedures(e.target.value)}
                  className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ผลที่ได้รับจากการประชุม</label>
                <textarea
                  disabled={!canEdit(gradeLevel)}
                  rows={3}
                  placeholder="ระบุความสำเร็จ แผนพัฒนา หรือแนวทางนำไปบูรณาการในวิชาเรียน..."
                  value={results}
                  onChange={(e) => setResults(e.target.value)}
                  className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ข้อเสนอแนะเพิ่มเติม</label>
                <textarea
                  disabled={!canEdit(gradeLevel)}
                  rows={2}
                  placeholder="ข้อเสนอแนะสำหรับการทำกิจกรรม PLC ครั้งถัดไป..."
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50"
                />
              </div>

              {/* IMAGE UPLOADER - 4 SEPARATE SLOTS */}
              <div className="pt-4">
                {/* Google Auth Status Banner */}
                <div className="bg-gradient-to-r from-purple-50 to-emerald-50 border border-purple-200/80 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${getCachedToken() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      <span className="text-sm font-bold text-gray-900">
                        {getCachedToken() ? '✅ เชื่อมต่อ Google แล้ว' : '🔑 ยืนยันเข้าสู่ระบบ Google เพื่อขอสิทธิ์อัปโหลด'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      เมื่อกดอัปโหลดรูปภาพ ระบบจะขึ้นป๊อบอัป Google เพื่อขอสิทธิ์การเขียนไฟล์ ให้กดยืนยันเข้าสู่ระบบ Google เพื่อบันทึกรูปภาพลงโฟลเดอร์ Google Drive ID: <span className="font-mono text-purple-900 font-bold">1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL</span> และ Google Sheet ID: <span className="font-mono text-purple-900 font-bold">14HIQBJxAjXcZCl1lU8UuSXeVIVL0VKtQKffXK_GqwPg</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await googleSignIn();
                        if (res?.accessToken) {
                          alert('✅ ยืนยันเข้าสู่ระบบ Google สำเร็จ! สามารถกดอัปโหลดรูปภาพไปยัง Google Drive ได้ทันที');
                          setImageSlots([...imageSlots]); // re-render state
                        }
                      } catch (err: any) {
                        alert(`⚠️ เข้าสู่ระบบ Google ไม่สำเร็จ: ${err?.message || 'ป๊อปอัปถูกปิดหรือถูกบล็อก'}`);
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shadow-sm shrink-0 ${
                      getCachedToken()
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-[#7D57B2] hover:bg-[#6A479C] text-white'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {getCachedToken() ? 'เชื่อมต่อ Google แล้ว (กดเพื่อเปลี่ยนบัญชี)' : '🔑 เข้าสู่ระบบ Google'}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-950">หลักฐานภาพถ่ายกิจกรรม (สูงสุด 4 ภาพ)</label>
                    <p className="text-xs text-gray-500">อัปโหลดรูปภาพทีละ 1 ภาพเข้าสู่ Google Drive ID: <span className="font-mono text-emerald-700 font-bold">1DRTYBqB6Mejcrr4SDQMsQV6JPyV7qwzL</span></p>
                  </div>
                  <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                    อัปโหลดแล้ว {imageSlots.filter(s => s.url).length} / 4 ภาพ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map((slotIdx) => {
                    const slot = imageSlots[slotIdx];
                    const slotTitle = `ภาพที่ ${slotIdx + 1}`;

                    return (
                      <div
                        key={slotIdx}
                        className="bg-white rounded-2xl border border-gray-200 p-3.5 flex flex-col justify-between space-y-3 shadow-sm hover:border-purple-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-lg">
                            📸 {slotTitle}
                          </span>
                          {slot.url && canEdit(gradeLevel) && (
                            removingSlotIdx === slotIdx ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                                <span className="text-[10px] font-bold text-rose-700">ลบรูป?</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlotImage(slotIdx)}
                                  className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 transition"
                                >
                                  ลบ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRemovingSlotIdx(null)}
                                  className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] font-medium hover:bg-gray-300 transition"
                                >
                                  ยกเลิก
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRemovingSlotIdx(slotIdx)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                title={`ลบ${slotTitle}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>

                        {/* Image Preview Box */}
                        <div className="relative w-full h-32 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                          {slot.url ? (
                            <img src={slot.url} alt={slotTitle} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-2 text-gray-400 space-y-1">
                              <Image className="w-7 h-7 mx-auto text-purple-400 opacity-60" />
                              <span className="text-[11px] block font-medium">ยังไม่มีรูปภาพ</span>
                            </div>
                          )}
                        </div>

                        {/* Hidden Input & Dedicated Button */}
                        <input
                          type="file"
                          ref={slotRefs[slotIdx]}
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleSingleSlotUpload(slotIdx, file);
                              e.target.value = '';
                            }
                          }}
                        />

                        {canEdit(gradeLevel) && (
                          <button
                            type="button"
                            disabled={slot.status === 'uploading'}
                            onClick={() => slotRefs[slotIdx].current?.click()}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                              slot.status === 'uploading'
                                ? 'bg-purple-100 text-purple-700 cursor-not-allowed'
                                : slot.url
                                ? 'bg-purple-50 hover:bg-purple-100 text-[#7D57B2] border border-purple-200'
                                : 'bg-[#7D57B2] hover:bg-[#6A479C] text-white'
                            }`}
                          >
                            {slot.status === 'uploading' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                กำลังอัปโหลด...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                {slot.url ? `เปลี่ยน${slotTitle}` : `อัปโหลด${slotTitle}`}
                              </>
                            )}
                          </button>
                        )}

                        {/* Upload Status Label Underneath */}
                        <div className="pt-1 border-t border-gray-100">
                          {slot.status === 'uploading' && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg block text-center animate-pulse">
                              ⏳ กำลังอัปโหลดไปยัง Google Drive...
                            </span>
                          )}
                          {slot.status === 'success' && slot.url && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg block text-center truncate">
                              ✅ อัปโหลดสำเร็จ (Drive & Sheet)
                            </span>
                          )}
                          {slot.status === 'error' && (
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-lg block text-center truncate" title={slot.statusText}>
                              ❌ {slot.statusText || 'เกิดข้อผิดพลาดในการอัปโหลด'}
                            </span>
                          )}
                          {slot.status === 'idle' && !slot.url && (
                            <span className="text-[10px] text-gray-400 block text-center font-medium">
                              📷 ยังไม่ได้อัปโหลดภาพ
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* การรับรอง */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ผู้รายงานข้อมูล</label>
                  <input
                    type="text"
                    disabled={!canEdit(gradeLevel)}
                    value={recorderName}
                    onChange={(e) => setRecorderName(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none font-medium disabled:bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ประธาน PLC</label>
                  <input
                    type="text"
                    disabled={!canEdit(gradeLevel)}
                    value={plcLeader}
                    onChange={(e) => setPlcLeader(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none font-medium disabled:bg-gray-50"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canEdit(gradeLevel) && (
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                className="h-[48px] px-8 bg-gradient-to-r from-[#7D57B2] to-[#E13A9D] hover:from-[#6b48a0] hover:to-[#ce2989] text-white font-semibold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                บันทึกข้อมูลกิจกรรม PLC
              </button>
            </div>
          )}

        </form>
      )}

      {/* Delete Confirmation Modal */}
      {deletingActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gray-900">ยืนยันการลบข้อมูลกิจกรรม PLC</h3>
              <p className="text-sm text-gray-600">
                คุณต้องการลบข้อมูลกิจกรรมบันทึกกิจกรรม PLC <span className="font-bold text-rose-600">ครั้งที่ {deletingActivity.times}</span> ({deletingActivity.groupName}) ออกจากระบบใช่หรือไม่?
              </p>
              <p className="text-xs text-gray-400">
                * ข้อมูลในครั้งนี้จะถูกลบออกจากระบบอย่างถาวร
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingActivity(null)}
                className="flex-1 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deletingActivity) {
                    onDelete?.(deletingActivity.id);
                    setDeletingActivity(null);
                    onShowSuccess();
                  }
                }}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md shadow-rose-200"
              >
                ยืนยันการลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
