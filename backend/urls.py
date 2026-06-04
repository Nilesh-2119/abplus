# Django API URLs Configuration
# Location: backend/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LabViewSet, UserViewSet, ActivityLogViewSet, DashboardStatsView,
    EmployeeViewSet, TestViewSet, PatientViewSet, ExpenseViewSet,
    LabSettingsView, LabActivityLogViewSet, MasterTestViewSet, LoginView,
    ReferredDoctorViewSet, ProfileView, CollectionDashboardStatsView,
    ChangePasswordView, DailyCloseoutViewSet, CashierAdminSettlementViewSet,
    CommissionDashboardStatsView, CommissionReportsView, CommissionSettleView,
    DoctorCommissionDetailView,
    CommissionReportPreviewView, CommissionReportPDFView, CommissionReportExcelView,
    InformativeReportsListView, InformativeReportPreviewView, InformativeReportExportView
)

# Create a DRF Router and register viewsets
router = DefaultRouter()
router.register(r'labs', LabViewSet, basename='lab')
router.register(r'users', UserViewSet, basename='user')
router.register(r'dashboard/logs', ActivityLogViewSet, basename='dashboard-logs')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'tests', TestViewSet, basename='test')
router.register(r'lab-tests', TestViewSet, basename='lab-test')
router.register(r'master-tests', MasterTestViewSet, basename='master-test')
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'activity-logs', LabActivityLogViewSet, basename='lab-activity-logs')
router.register(r'referred-doctors', ReferredDoctorViewSet, basename='referred-doctor')
router.register(r'closeouts', DailyCloseoutViewSet, basename='closeout')
router.register(r'cashier-lab-settlements', CashierAdminSettlementViewSet, basename='cashier-lab-settlement')

urlpatterns = [
    # Router registered endpoints (/api/labs/, /api/users/, etc.)
    path('', include(router.urls)),
    
    # Custom dashboard aggregation statistics endpoint
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    
    # Lab letterhead and branding configurations
    path('settings/', LabSettingsView.as_view(), name='lab-settings'),
    
    # User and employee authentication login endpoint
    path('login/', LoginView.as_view(), name='login'),
    
    # Token refresh endpoint
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Profile endpoint for currently logged-in user
    path('me/', ProfileView.as_view(), name='profile-me'),
    
    # Change Password endpoint
    path('me/change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # Collection Boy dashboard analytics endpoint
    path('collection-dashboard/', CollectionDashboardStatsView.as_view(), name='collection-dashboard'),

    # Doctor Commission Management Endpoints
    path('commission/stats/', CommissionDashboardStatsView.as_view(), name='commission-stats'),
    path('commission/reports/', CommissionReportsView.as_view(), name='commission-reports'),
    path('commission/settle/', CommissionSettleView.as_view(), name='commission-settle'),
    path('commission/doctor/<str:doctor_id>/', DoctorCommissionDetailView.as_view(), name='commission-doctor-detail'),

    # Commission Report Export Endpoints
    path('commission/report-preview/', CommissionReportPreviewView.as_view(), name='commission-report-preview'),
    path('commission/export-pdf/', CommissionReportPDFView.as_view(), name='commission-export-pdf'),
    path('commission/export-excel/', CommissionReportExcelView.as_view(), name='commission-export-excel'),

    # Informative Reports Endpoints
    path('informative-reports/', InformativeReportsListView.as_view(), name='informative-reports-list'),
    path('informative-reports/preview/', InformativeReportPreviewView.as_view(), name='informative-reports-preview'),
    path('informative-reports/export/', InformativeReportExportView.as_view(), name='informative-reports-export'),
]

