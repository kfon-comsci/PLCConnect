import { MasterInnovation, PLCActivity, ClassroomInnovation, AdminSettings, AppUser } from '../types';

export const initialAdminSettings: AdminSettings = {
  driveLinks: {
    flowchart: '',
    brochure: '',
    workImage: '',
    activityCollection: '',
    additionalDoc: '',
  },
  googleDriveLinks: [],
  gradePlans: [],
  subjectPlans: [],
  activityPhotos: []
};

export const defaultUsers: AppUser[] = [];

export const initialMasterInnovations: MasterInnovation[] = [];

export const initialPLCActivities: PLCActivity[] = [];

export const initialClassroomInnovations: ClassroomInnovation[] = [];
