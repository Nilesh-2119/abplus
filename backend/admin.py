from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    CustomUser, Lab, LabSettings, MasterTest, ReferredDoctor, 
    PatientEntry, Expense, Report, PaymentTransaction, DailyCloseout
)

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('username', 'email', 'role', 'lab', 'status', 'is_staff', 'is_superuser')
    list_filter = ('role', 'status', 'is_staff', 'is_superuser', 'lab')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('username',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Scoping', {'fields': ('role', 'lab', 'status', 'requires_password_change')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Scoping', {'fields': ('role', 'lab', 'status', 'requires_password_change')}),
    )

class LabAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'lab_code', 'status', 'phone', 'admin_name', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'lab_code', 'admin_name')
    ordering = ('-created_at',)

# Register models to make them visible in Django Admin
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Lab, LabAdmin)
admin.site.register(LabSettings)
admin.site.register(MasterTest)
admin.site.register(ReferredDoctor)
admin.site.register(PatientEntry)
admin.site.register(Expense)
admin.site.register(Report)
admin.site.register(PaymentTransaction)
admin.site.register(DailyCloseout)
