from rest_framework import serializers
from accounts.models import Account
from contacts.models import Contact
from deals.models import Deal
from .models import (
    Project, ProjectTask, ProjectPhase, ProjectIssue,
    ProjectMember, ProjectFile, ProjectNote, ProjectTimeLog,
)
from projectdesk.serializers import ProjectDeskMeetingSerializer, ProjectDeskTaskSerializer


class ProjectTaskSerializer(serializers.ModelSerializer):
    due_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = ProjectTask
        fields = ['id', 'title', 'description', 'owner', 'assigned_by', 'due_date', 'status', 'priority']


class ProjectPhaseSerializer(serializers.ModelSerializer):
    due_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = ProjectPhase
        fields = ['id', 'name', 'status', 'due_date']


class ProjectIssueSerializer(serializers.ModelSerializer):
    due_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = ProjectIssue
        fields = ['id', 'title', 'severity', 'owner', 'status', 'due_date']


class ProjectMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMember
        fields = ['id', 'name', 'role', 'email']


class ProjectFileSerializer(serializers.ModelSerializer):
    uploaded_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ProjectFile
        fields = ['id', 'name', 'type', 'uploaded_by', 'uploaded_at', 'file_url']


class ProjectNoteSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ProjectNote
        fields = ['id', 'content', 'created_by', 'created_at']


class ProjectTimeLogSerializer(serializers.ModelSerializer):
    date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = ProjectTimeLog
        fields = ['id', 'member', 'task', 'date', 'hours']


class ProjectListSerializer(serializers.ModelSerializer):
    account_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    deal_name = serializers.SerializerMethodField()
    team_count = serializers.IntegerField(read_only=True)
    logged_hours = serializers.FloatField(read_only=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Project
        fields = [
            'id', 'project_code', 'name', 'account', 'account_name',
            'contact', 'contact_name', 'deal', 'deal_name',
            'source_module', 'source_record_id', 'source_record_label',
            'owner', 'status', 'priority', 'progress',
            'start_date', 'due_date', 'description', 'team_count',
            'estimated_hours', 'logged_hours',
        ]

    def get_account_name(self, obj):
        return obj.account.account_name if obj.account_id else obj.account_name

    def get_contact_name(self, obj):
        return (
            f"{obj.contact.first_name} {obj.contact.last_name}".strip()
            if obj.contact_id
            else obj.contact_name
        )

    def get_deal_name(self, obj):
        return obj.deal.deal_name if obj.deal_id else obj.deal_name


class ProjectDetailSerializer(serializers.ModelSerializer):
    account_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    deal_name = serializers.SerializerMethodField()
    tasks = ProjectDeskTaskSerializer(source="projectdesk_tasks", many=True, read_only=True)
    meetings = ProjectDeskMeetingSerializer(source="projectdesk_meetings", many=True, read_only=True)
    phases = ProjectPhaseSerializer(many=True, read_only=True)
    issues = ProjectIssueSerializer(many=True, read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True)
    files = ProjectFileSerializer(many=True, read_only=True)
    notes = ProjectNoteSerializer(many=True, read_only=True)
    time_logs = ProjectTimeLogSerializer(many=True, read_only=True)
    team_count = serializers.IntegerField(read_only=True)
    logged_hours = serializers.FloatField(read_only=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Project
        fields = [
            'id', 'project_code', 'name', 'account', 'account_name',
            'contact', 'contact_name', 'deal', 'deal_name',
            'source_module', 'source_record_id', 'source_record_label',
            'owner', 'status', 'priority', 'progress',
            'start_date', 'due_date', 'description', 'team_count',
            'estimated_hours', 'logged_hours',
            'tasks', 'meetings', 'phases', 'issues', 'members', 'files', 'notes', 'time_logs',
        ]

    def get_account_name(self, obj):
        return obj.account.account_name if obj.account_id else obj.account_name

    def get_contact_name(self, obj):
        return (
            f"{obj.contact.first_name} {obj.contact.last_name}".strip()
            if obj.contact_id
            else obj.contact_name
        )

    def get_deal_name(self, obj):
        return obj.deal.deal_name if obj.deal_id else obj.deal_name


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(), required=False, allow_null=True
    )
    contact = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(), required=False, allow_null=True
    )
    deal = serializers.PrimaryKeyRelatedField(
        queryset=Deal.objects.all(), required=False, allow_null=True
    )
    start_date = serializers.DateField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    estimated_hours = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False, allow_null=True, default=0
    )

    class Meta:
        model = Project
        fields = [
            'project_code', 'name', 'account', 'account_name',
            'contact', 'contact_name', 'deal', 'deal_name',
            'source_module', 'source_record_id', 'source_record_label',
            'owner', 'status', 'priority', 'progress',
            'start_date', 'due_date', 'description', 'estimated_hours',
        ]

    def validate(self, attrs):
        if "account" in attrs:
            attrs["account_name"] = attrs["account"].account_name if attrs["account"] else ""
        if "contact" in attrs:
            contact = attrs["contact"]
            attrs["contact_name"] = (
                f"{contact.first_name} {contact.last_name}".strip() if contact else ""
            )
        if "deal" in attrs:
            attrs["deal_name"] = attrs["deal"].deal_name if attrs["deal"] else ""
        return attrs

    def validate_progress(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Progress must be between 0 and 100.")
        return value

    def validate_estimated_hours(self, value):
        return 0 if value is None else value
