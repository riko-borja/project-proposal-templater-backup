import { createRouter, createWebHistory } from 'vue-router';
import LogIn from '@/components/LogIn.vue';
import CreateUser from '@/components/CreateUser.vue';
import PageOne from '@/components/PageOne.vue';
import AdminDashboard from '@/components/AdminDashboard.vue';
import UserDeletion from '@/components/UserDeletion.vue';
import ViewUsers from '@/components/ViewUsers.vue';
import ViewLogs from '@/components/ViewLogs.vue';
import DocumentLogs from '@/components/DocumentLogs.vue';
import WordViewer from '@/components/WordViewer.vue';
import ProcDoc from '@/components/ProcDoc.vue';
import ProcessingPage from '@/components/ProcessingPage.vue';
import EditorPage from '@/components/EditorPage.vue';
import ExcelEditorPage from '@/components/ExcelEditorPage.vue';
import UserOptionsPage from '@/components/UserOptionsPage.vue'; 
import InputFieldsPage from '@/components/InputFieldsPage.vue';
import CheckboxPage from '@/components/CheckboxPage.vue';
import UploadStandardDocuments from '@/components/UploadStandardDocuments.vue';
import WelcomePage from '@/components/WelcomePage.vue';
import UploadForApproval from '@/components/UploadForApproval.vue';
import LogsChart from '@/components/LogsChart.vue';
import GeneratedDocsByDate from '@/components/GeneratedDocsByDate.vue';
import LoginTrendsChart from '@/components/LoginTrendsChart.vue';
import DynamicTablePage from '@/components/DynamicTablePage.vue';
import DocumentsByUserAndFileChart from '@/components/DocumentsByUserAndFileChart.vue';
import DocumentTypesChart from '@/components/DocumentTypesChart.vue';
import TopUsersChart from '@/components/TopUsersChart.vue';
import DocumentTrendChart from '@/components/DocumentTrendChart.vue';
import FlowChartComponent from '@/components/FlowChartComponent.vue';
import SelectCategory from '@/components/SelectCategory.vue';
import SimpleExplorer from '@/components/SimpleExplorer.vue';
import IntentRecognitionPage from '@/components/IntentRecognitionPage.vue';
import SharePoint from '@/components/SharePoint.vue';
import AdminFieldManager from '@/components/AdminFieldManager.vue';


const routes = [
  { path: '/', name: 'login', component: LogIn, meta: { hideHeader: true } },
  { path: '/create-user', name: 'createUser', component: CreateUser },
  { path: '/pageone', name: 'pageone', component: PageOne, props: true },
  { path: '/admin-dashboard', name: 'adminDashboard', component: AdminDashboard, meta: { hideHeader: true } },
  { path: '/user-deletion', name: 'userDeletion', component: UserDeletion },
  { path: '/view-users', name: 'viewUsers', component: ViewUsers },
  { path: '/view-logs', name: 'viewLogs', component: ViewLogs },
  { path: '/document-logs', name: 'documentLogs', component: DocumentLogs },
  { path: '/word-viewer', name: 'wordViewer', component: WordViewer },
  { path: '/proc-doc', name: 'procDoc', component: ProcDoc },
  { path: '/excel-editor/:fileId', name: 'ExcelEditorPage', component: ExcelEditorPage, props: true },
  { path: '/simple-explorer', name: 'simpleExplorer', component: SimpleExplorer, meta: { hideHeader: true } },
  { path: '/upload-standard-documents', name: 'uploadStandardDocuments', component: UploadStandardDocuments },
  { path: '/welcome', name: 'welcomePage', component: WelcomePage },
  { path: '/upload-for-approval', name: 'uploadForApproval', component: UploadForApproval },
  { path: '/logs-chart', name: 'LogsChart', component: LogsChart},
  { path: '/generated-docs-by-date', name: 'generatedDocsByDate', component: GeneratedDocsByDate},
  { path: '/login-trends-chart', name: 'loginTrendsChart', component: LoginTrendsChart},
  { path: '/documents-by-user-and-file-chart', name: 'documentsByUserAndFileChart', component: DocumentsByUserAndFileChart},
  { path: '/document-types-chart', name: 'documentTypesChart', component: DocumentTypesChart},
  { path: '/top-users-chart', name: 'topUsersChart', component: TopUsersChart},
  { path: '/document-trend-chart', name: 'documentTrendChart', component: DocumentTrendChart},
  { path: '/flow-chart-component', name: 'flowChartComponent', component: FlowChartComponent},
  { path: '/select-category', name: 'selectCategory', component: SelectCategory},
  { path: '/intent-recognition-page', name: 'intentRecognitionPage', component: IntentRecognitionPage, meta: { hideHeader: true } },
  { path: '/input-fields-page', name: 'inputFieldsPage', component: InputFieldsPage },
  { path: '/checkbox-page', name: 'checkboxPage', component: CheckboxPage },
  { path: '/processing/:fileId', name: 'ProcessingPage', component: ProcessingPage, props: true },
  { path: '/editor/:fileId', name: 'EditorPage', component: EditorPage, props: true },
  { path: '/user-options', name: 'userOptionsPage', component: UserOptionsPage },
  { path: '/upload-for-approval', name: 'uploadForApproval', component: UploadForApproval },
  { path: '/dynamic-table-page', name: 'dynamicTablePage', component: DynamicTablePage},
  { path: '/share-point', name: 'sharePoint', component: SharePoint},
  { path: '/admin-field-manager', name: 'adminFieldManager', component: AdminFieldManager},

];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;