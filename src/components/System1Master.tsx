import React, { useState, useEffect } from 'react';
import { MasterInnovation, Committee, AppUser, CompetencyTemplate } from '../types';
import { Plus, Trash2, Save, Layers, HelpCircle, ShieldAlert, CheckCircle2, Edit, Check, X } from 'lucide-react';

interface System1MasterProps {
  currentUser: AppUser;
  masterInnovations: MasterInnovation[];
  onSave: (record: MasterInnovation) => void;
  onShowSuccess: () => void;
}

export const System1Master: React.FC<System1MasterProps> = ({
  currentUser,
  masterInnovations,
  onSave,
  onShowSuccess
}) => {
  // Determine which grade levels this user can manage
  const isAllAccess = currentUser.role === 'Admin';
  const isCommittee = currentUser.role === 'Committee';
  const isExecutive = currentUser.role === 'Executive';
  const userGrade = currentUser.assignedGrade || 'ม.1';
  
  // Admin, Executive and Committee can view all grade levels
  const canSelectAnyGrade = isAllAccess || isExecutive || isCommittee;

  const [selectedGrade, setSelectedGrade] = useState<'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'>(
    isCommittee ? (userGrade as any) : 'ม.1'
  );

  // Form states
  const [academicYear, setAcademicYear] = useState<number>(2569);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [theme, setTheme] = useState<string>('');
  
  const [competencies, setCompetencies] = useState<CompetencyTemplate>({
    thai: '', math: '', science: '', technology: '', social: '',
    english: '', chinese: '', career: '', health: '', art: '', guidance: ''
  });

  const [committees, setCommittees] = useState<Committee[]>([]);

  // New committee form states
  const [newCommName, setNewCommName] = useState('');
  const [newCommRole, setNewCommRole] = useState<'ประธาน' | 'รองประธาน' | 'ประชาสัมพันธ์' | 'เหรัญญิก' | 'เลขานุการ' | 'คณะกรรมการ'>('คณะกรรมการ');
  const [newCommClass, setNewCommClass] = useState('');

  // Inline editing states for committee members
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [editCommName, setEditCommName] = useState('');
  const [editCommRole, setEditCommRole] = useState<'ประธาน' | 'รองประธาน' | 'ประชาสัมพันธ์' | 'เหรัญญิก' | 'เลขานุการ' | 'คณะกรรมการ'>('คณะกรรมการ');
  const [editCommClass, setEditCommClass] = useState('');
  const [confirmingDeleteCommId, setConfirmingDeleteCommId] = useState<string | null>(null);

  // Load selected grade level record if exists
  useEffect(() => {
    const existing = masterInnovations.find(m => m.gradeLevel === selectedGrade);
    if (existing) {
      setAcademicYear(existing.academicYear);
      setSemester(existing.semester);
      setTheme(existing.theme);
      setCompetencies({ ...existing.competencies });
      setCommittees([...existing.committees]);
    } else {
      // Set empty/defaults
      setAcademicYear(2569);
      setSemester(1);
      setTheme('');
      setCompetencies({
        thai: '', math: '', science: '', technology: '', social: '',
        english: '', chinese: '', career: '', health: '', art: '', guidance: ''
      });
      setCommittees([]);
    }
    setEditingCommId(null);
  }, [selectedGrade, masterInnovations]);

  // Generate advisory rooms depending on grade
  const maxRoom = ['ม.1', 'ม.2', 'ม.3'].includes(selectedGrade) ? 8 : 9;
  const advisoryRooms: string[] = [];
  for (let i = 1; i <= maxRoom; i++) {
    advisoryRooms.push(`${selectedGrade}/${i}`);
  }

  // Handle committee add
  const handleAddCommittee = () => {
    if (!newCommName.trim()) return;
    const newComm: Committee = {
      id: `comm-${Date.now()}`,
      name: newCommName,
      role: newCommRole,
      advisoryClass: newCommClass || undefined
    };
    const nextCommittees = [...committees, newComm];
    setCommittees(nextCommittees);
    setNewCommName('');
    setNewCommRole('คณะกรรมการ');
    setNewCommClass('');

    const existingMaster = masterInnovations.find(m => m.gradeLevel === selectedGrade);
    const record: MasterInnovation = {
      id: existingMaster?.id || `master-${Date.now()}`,
      academicYear,
      semester,
      gradeLevel: selectedGrade,
      theme,
      competencies,
      committees: nextCommittees
    };
    onSave(record);
  };

  // Handle committee edit start
  const handleStartEdit = (member: Committee) => {
    setEditingCommId(member.id);
    setEditCommName(member.name);
    setEditCommRole(member.role);
    setEditCommClass(member.advisoryClass || '');
  };

  // Handle committee edit save
  const handleSaveEdit = (id: string) => {
    if (!editCommName.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    const nextCommittees = committees.map(c => c.id === id ? {
      ...c,
      name: editCommName,
      role: editCommRole,
      advisoryClass: editCommClass || undefined
    } : c);
    setCommittees(nextCommittees);
    setEditingCommId(null);

    const existingMaster = masterInnovations.find(m => m.gradeLevel === selectedGrade);
    const record: MasterInnovation = {
      id: existingMaster?.id || `master-${Date.now()}`,
      academicYear,
      semester,
      gradeLevel: selectedGrade,
      theme,
      competencies,
      committees: nextCommittees
    };
    onSave(record);
  };

  // Handle committee delete
  const handleDeleteCommittee = (id: string) => {
    const nextCommittees = committees.filter(c => c.id !== id);
    setCommittees(nextCommittees);
    if (editingCommId === id) {
      setEditingCommId(null);
    }
    setConfirmingDeleteCommId(null);

    const existingMaster = masterInnovations.find(m => m.gradeLevel === selectedGrade);
    const record: MasterInnovation = {
      id: existingMaster?.id || `master-${Date.now()}`,
      academicYear,
      semester,
      gradeLevel: selectedGrade,
      theme,
      competencies,
      committees: nextCommittees
    };
    onSave(record);
  };

  // Save Part 1 (Theme and Competencies)
  const handleSavePart1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) {
      alert('กรุณากรอกธีมนวัตกรรม');
      return;
    }

    const existingId = masterInnovations.find(m => m.gradeLevel === selectedGrade)?.id || `master-${Date.now()}`;
    
    const record: MasterInnovation = {
      id: existingId,
      academicYear,
      semester,
      gradeLevel: selectedGrade,
      theme,
      competencies,
      committees // Keep current committees
    };

    onSave(record);
    onShowSuccess();
  };

  // Save Part 2 (Committee List)
  const handleSavePart2 = (e: React.FormEvent) => {
    e.preventDefault();

    const existingId = masterInnovations.find(m => m.gradeLevel === selectedGrade)?.id || `master-${Date.now()}`;
    
    const record: MasterInnovation = {
      id: existingId,
      academicYear,
      semester,
      gradeLevel: selectedGrade,
      theme,
      competencies,
      committees
    };

    onSave(record);
    onShowSuccess();
  };

  // RBAC checks
  const canEdit = isAllAccess || (isCommittee && userGrade === selectedGrade);

  return (
    <div className="space-y-6">
      
      {/* Grade Selector Header */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#7D57B2]" />
            ระบบบันทึกนวัตกรรมระดับชั้นเรียน
          </h2>
          <p className="text-sm text-[#6A5077] mt-1 font-medium">
            กำหนดข้อมูลแม่แบบของระดับชั้น คณะกรรมการ และเกณฑ์สมรรถนะของนวัตกรรมสายชั้น
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">เลือกระดับชั้น:</label>
          <div className="flex flex-wrap gap-1">
            {['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map((grade) => {
              const isAllowed = canSelectAnyGrade || userGrade === grade;
              const isSelected = selectedGrade === grade;
              
              return (
                <button
                  key={grade}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => setSelectedGrade(grade as any)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-xl transition ${
                    isSelected
                      ? 'bg-[#E13A9D] text-white shadow-sm'
                      : isAllowed
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {grade}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!canEdit ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-6 flex gap-4 items-start">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-lg">สิทธิ์การเข้าถึงจำกัด</h4>
            <p className="text-sm text-amber-800 mt-1">
              เฉพาะ **ผู้ดูแลระบบ (Admin)** และ **คณะกรรมการประจำระดับชั้น ({selectedGrade})** เท่านั้นที่สามารถแก้ไขแม่แบบ วช.13 ได้
              ขณะนี้คุณอยู่ในโหมด "อ่านอย่างเดียว" สำหรับระดับชั้นนี้
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSavePart1} className="space-y-6">
        
        {/* ส่วนที่ 1: รายละเอียดนวัตกรรม (Master Record) */}
        <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-950">
                ส่วนที่ 1: รายละเอียดนวัตกรรมระดับชั้น {selectedGrade}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 font-medium">รายละเอียดแม่แบบที่ทุกห้องเรียนจะใช้อ้างอิงร่วมกัน</p>
            </div>
            <div className="bg-[#7D57B2]/10 border border-[#7D57B2]/20 px-3 py-1.5 rounded-xl text-xs font-bold text-[#7D57B2]">
              รูปแบบภาคเรียน/ปีการศึกษา: {semester}/{academicYear}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">ธีมนวัตกรรมของสายชั้น (Innovation Theme)</label>
            <input
              type="text"
              disabled={!canEdit}
              placeholder="เช่น เกษตรอินทรีย์วิถีจันท์, Smart City จันทบุรี"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 disabled:text-gray-500 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ปีการศึกษา (เช่น {academicYear})</label>
              <input
                type="number"
                disabled={!canEdit}
                min={2500}
                max={2600}
                value={academicYear}
                onChange={(e) => setAcademicYear(parseInt(e.target.value) || 2569)}
                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 disabled:text-gray-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ภาคเรียนที่ (เช่น {semester})</label>
              <select
                disabled={!canEdit}
                value={semester}
                onChange={(e) => setSemester(parseInt(e.target.value) as any)}
                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7D57B2] disabled:bg-gray-50 disabled:text-gray-500 font-medium font-semibold"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ระดับชั้น</label>
              <input
                type="text"
                value={selectedGrade}
                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 font-bold text-gray-700"
                disabled
              />
            </div>
          </div>

          {/* ฐานสมรรถนะแม่แบบ (11 ด้าน) */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-[#7D57B2] mb-4 flex items-center gap-2">
              <span>🎯</span> ฐานสมรรถนะแม่แบบของสายชั้น (11 กลุ่มสาระฯ/ด้าน)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: 'thai', label: 'ภาษาไทย' },
                { key: 'math', label: 'คณิตศาสตร์' },
                { key: 'science', label: 'วิทยาศาสตร์และเทคโนโลยี' },
                { key: 'technology', label: 'วิทยาศาสตร์และเทคโนโลยี (เทคโนโลยี)' },
                { key: 'social', label: 'สังคมศึกษา ศาสนาและวัฒนธรรม' },
                { key: 'english', label: 'ภาษาต่างประเทศ (อังกฤษ)' },
                { key: 'chinese', label: 'ภาษาต่างประเทศ (จีน)' },
                { key: 'career', label: 'การงานอาชีพ' },
                { key: 'health', label: 'สุขศึกษาและพลศึกษา' },
                { key: 'art', label: 'ศิลปะ' },
                { key: 'guidance', label: 'แนะแนว' },
              ].map((item) => (
                <div key={item.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{item.label}</label>
                  <textarea
                    disabled={!canEdit}
                    rows={2}
                    value={(competencies as any)[item.key]}
                    onChange={(e) => setCompetencies({ ...competencies, [item.key]: e.target.value })}
                    placeholder={`ระบุคำอธิบายสมรรถนะด้าน${item.label}...`}
                    className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7D57B2] text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>
              ))}
            </div>
          </div>
          
          {canEdit && (
            <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
              <button
                type="submit"
                className="h-[44px] px-6 bg-[#7D57B2] hover:bg-[#6b48a0] text-white font-semibold rounded-xl transition duration-200 shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                บันทึกรายละเอียดและฐานสมรรถนะ (ส่วนที่ 1)
              </button>
            </div>
          )}
        </div>
      </form>

      <form onSubmit={handleSavePart2} className="space-y-6 mt-6">
        {/* ส่วนที่ 2 คณะกรรมการดำเนินงานประจำระดับชั้น */}
        <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-950">
              ส่วนที่ 2: คณะกรรมการดำเนินงานประจำระดับชั้น ({selectedGrade})
            </h3>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">บันทึกรายชื่อคณะกรรมการ และล็อกห้องเรียนที่ปรึกษาตามเงื่อนไข</p>
          </div>

          {canEdit && (
            <div className="bg-[#F5F4F7]/40 p-5 rounded-2xl border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  placeholder="เช่น ครูสมจิตร วงศ์ดี"
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">บทบาทหน้าที่</label>
                <select
                  value={newCommRole}
                  onChange={(e) => setNewCommRole(e.target.value as any)}
                  className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] font-medium"
                >
                  <option value="ประธาน">ประธาน</option>
                  <option value="รองประธาน">รองประธาน</option>
                  <option value="ประชาสัมพันธ์">ประชาสัมพันธ์</option>
                  <option value="เหรัญญิก">เหรัญญิก</option>
                  <option value="เลขานุการ">เลขานุการ</option>
                  <option value="คณะกรรมการ">คณะกรรมการ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ห้องเรียนที่ปรึกษา</label>
                <select
                  value={newCommClass}
                  onChange={(e) => setNewCommClass(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] font-medium"
                >
                  <option value="">ไม่มี (ไม่ใช่ครูประจำชั้น)</option>
                  {advisoryRooms.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddCommittee}
                className="h-11 bg-[#7D57B2] hover:bg-[#6b48a0] text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4" /> เพิ่มกรรมการ
              </button>
            </div>
          )}

          {/* Committee List Table */}
          <div className="overflow-x-auto border border-gray-100 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F4F7] text-[#6A5077] text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">ลำดับ</th>
                  <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4">บทบาทหน้าที่</th>
                  <th className="px-6 py-4">ห้องเรียนที่ปรึกษา</th>
                  {canEdit && <th className="px-6 py-4 text-center">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium">
                {committees.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="px-6 py-12 text-center text-gray-400 font-medium">
                      ไม่มีรายชื่อคณะกรรมการดำเนินงาน คาดว่าข้อมูลว่างเปล่า
                    </td>
                  </tr>
                ) : (
                  committees.map((member, index) => {
                    const isEditing = editingCommId === member.id;
                    return (
                      <tr key={member.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 text-gray-500 font-mono">{index + 1}</td>
                        <td className="px-6 py-4 text-gray-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editCommName}
                              onChange={(e) => setEditCommName(e.target.value)}
                              className="h-9 px-2 border border-gray-300 rounded-lg text-sm w-full font-medium"
                            />
                          ) : (
                            member.name
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={editCommRole}
                              onChange={(e) => setEditCommRole(e.target.value as any)}
                              className="h-9 px-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold"
                            >
                              <option value="ประธาน">ประธาน</option>
                              <option value="รองประธาน">รองประธาน</option>
                              <option value="ประชาสัมพันธ์">ประชาสัมพันธ์</option>
                              <option value="เหรัญญิก">เหรัญญิก</option>
                              <option value="เลขานุการ">เลขานุการ</option>
                              <option value="คณะกรรมการ">คณะกรรมการ</option>
                            </select>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              member.role === 'ประธาน' ? 'bg-[#E13A9D]/10 text-[#E13A9D]' :
                              member.role === 'รองประธาน' ? 'bg-[#7D57B2]/10 text-[#7D57B2]' :
                              member.role === 'เลขานุการ' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {member.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-600">
                          {isEditing ? (
                            <select
                              value={editCommClass}
                              onChange={(e) => setEditCommClass(e.target.value)}
                              className="h-9 px-2 border border-gray-300 rounded-lg text-sm bg-white font-semibold"
                            >
                              <option value="">ไม่มี</option>
                              {advisoryRooms.map(room => (
                                <option key={room} value={room}>{room}</option>
                              ))}
                            </select>
                          ) : (
                            member.advisoryClass || '—'
                          )}
                        </td>
                        {canEdit && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(member.id)}
                                    className="text-emerald-600 hover:text-emerald-800 p-1 rounded-lg hover:bg-emerald-50 transition"
                                    title="บันทึก"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCommId(null)}
                                    className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition"
                                    title="ยกเลิก"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : confirmingDeleteCommId === member.id ? (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                                  <span className="text-[11px] font-bold text-rose-700">ลบ?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCommittee(member.id)}
                                    className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 transition"
                                  >
                                    ใช่
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingDeleteCommId(null)}
                                    className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] font-medium hover:bg-gray-300 transition"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(member)}
                                    className="text-[#1696CC] hover:text-[#1696CC]/80 p-1 rounded-lg hover:bg-blue-50 transition"
                                    title="แก้ไข"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingDeleteCommId(member.id)}
                                    className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition"
                                    title="ลบ"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {canEdit && (
            <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
              <button
                type="submit"
                className="h-[44px] px-6 bg-gradient-to-r from-[#7D57B2] to-[#E13A9D] hover:from-[#6b48a0] hover:to-[#ce2989] text-white font-semibold rounded-xl transition shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                บันทึกรายชื่อคณะกรรมการดำเนินงาน (ส่วนที่ 2)
              </button>
            </div>
          )}
        </div>

      </form>
    </div>
  );
};
