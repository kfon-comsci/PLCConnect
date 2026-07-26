export interface CompetencyTemplate {
  thai: string;
  math: string;
  science: string;
  technology: string;
  social: string;
  english: string;
  chinese: string;
  career: string;
  health: string;
  art: string;
  guidance: string;
}

export interface Committee {
  id: string;
  name: string;
  role: 'ประธาน' | 'รองประธาน' | 'ประชาสัมพันธ์' | 'เหรัญญิก' | 'เลขานุการ' | 'คณะกรรมการ';
  advisoryClass?: string; // e.g. "ม.1/1"
}

// ระบบที่ 1 Master Record
export interface MasterInnovation {
  id: string;
  academicYear: number; // e.g. 2569
  semester: 1 | 2;
  gradeLevel: 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6';
  theme: string;
  competencies: CompetencyTemplate;
  committees: Committee[];
}

// ระบบที่ 2 PLC Activity Record
export interface PLCActivity {
  id: string;
  gradeLevel: 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6';
  semester: 1 | 2;
  academicYear: number;
  groupName: string;
  times: number; // ครั้งที่ (เลขไม่เกิน 2 หลัก)
  date: string;
  location: string;
  durationHours: number; // 1-24
  durationMinutes: number; // 0-60
  plcLeader: string;
  expertRole1: string; // ครูผู้สอน
  expertRole2: string; // ครูร่วมเรียนรู้
  expertRole3: string; // ผู้เชี่ยวชาญ
  expertRole4: string; // ฝ่ายวิชาการ/หัวหน้ากลุ่มสาระฯ/หัวหน้าสายชั้น
  otherParticipants: string; // ผู้มีส่วนร่วมอื่นๆ
  procedures: string; // ขั้นตอนการดำเนินงาน
  results: string; // ผลที่ได้
  suggestions: string; // ข้อเสนอแนะ
  images: string[]; // Base64 or object URLs for up to 4 images
  recorderName: string;
  certifiedName: string;
  signatures?: {
    recorderSig?: string; // base64
    viceDirectorSig?: string; // base64
    directorSig?: string; // base64
  };
}

// สมาชิกคณะกรรมการห้องเรียน
export interface ClassroomCommittees {
  president: string;
  vicePresident: string;
  publicRelations: string;
  treasurer: string;
  secretary: string;
}

// ระบบที่ 3 Classroom Innovation
export interface ClassroomInnovation {
  id: string;
  masterId: string; // ref to MasterInnovation
  classroomName: string; // e.g. "ม.1/1"
  innovationName: string;
  memberCount: number;
  committees: ClassroomCommittees;
  briefDetails: string;
  goals: string;
  expectedBenefits: string;
  competencies: CompetencyTemplate; // custom description for each of the 11 areas
  reporterName: string;
  classroomPresident: string;
  files: {
    flowchart?: UploadedFile;
    brochure?: UploadedFile;
    workImage?: UploadedFile;
    activityCollection?: UploadedFile;
    additionalDoc?: UploadedFile;
  };
  signatures?: {
    viceDirectorSig?: string;
    directorSig?: string;
  };
}

export interface UploadedFile {
  name: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  url: string;
}

// User role configuration (RBAC)
export type UserRole = 'Admin' | 'Executive' | 'Committee' | 'Recorder' | 'Viewer';

export interface AppUser {
  email: string;
  role: UserRole;
  name: string;
  password?: string;
  assignedGrade?: 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6';
  assignedClassroom?: string; // e.g. "ม.1/1"
}

// Admin settings for drive targets
export interface GoogleDriveLink {
  id: string;
  gradeLevel: 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6';
  room: string; // "1" to "9"
  link: string;
  note?: string;
}

export interface GradePlanLink {
  id: string;
  gradeLevel: 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6';
  link: string;
  note?: string;
}

export interface SubjectPlanLink {
  id: string;
  gradeLevel: 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6';
  link: string;
  note?: string;
}

export interface ActivityPhotoLink {
  id: string;
  gradeLevel: 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6';
  link: string;
  note?: string;
}

export interface AdminSettings {
  driveLinks: {
    flowchart: string;
    brochure: string;
    workImage: string;
    activityCollection: string;
    additionalDoc: string;
  };
  googleDriveLinks?: GoogleDriveLink[];
  gradePlans?: GradePlanLink[];
  subjectPlans?: SubjectPlanLink[];
  activityPhotos?: ActivityPhotoLink[];
}
