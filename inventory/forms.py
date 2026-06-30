from django import forms
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.forms import AuthenticationForm, UsernameField
from django.contrib.auth.password_validation import validate_password
from django.db import transaction

from .models import Asset, Assignment, Employee, MaintenanceLog


class AssetForm(forms.ModelForm):
    class Meta:
        model = Asset
        fields = ["name", "type", "serial_number", "status"]

    def clean_serial_number(self) -> str:
        serial_number = self.cleaned_data["serial_number"]
        duplicate_assets = Asset.objects.filter(serial_number__iexact=serial_number)

        if self.instance.pk:
            duplicate_assets = duplicate_assets.exclude(pk=self.instance.pk)

        if duplicate_assets.exists():
            raise forms.ValidationError(
                "An asset with this serial number already exists in the system."
            )

        return serial_number


class EmployeeForm(forms.ModelForm):
    class Meta:
        model = Employee
        fields = ["name", "user", "department", "email"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["department"].choices = [
            ("", "Select a department"),
            *Employee.Department.choices,
        ]


class EmployeeCreateForm(forms.Form):
    username = forms.CharField(max_length=150)
    email = forms.EmailField()
    department = forms.ChoiceField(
        choices=[("", "Select a department"), *Employee.Department.choices],
    )
    password = forms.CharField(widget=forms.PasswordInput)
    confirm_password = forms.CharField(
        label="Confirm Password",
        widget=forms.PasswordInput,
    )

    def clean_username(self):
        username = self.cleaned_data["username"].strip()
        if get_user_model().objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("A user with this username already exists.")
        return username

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        user_model = get_user_model()
        if user_model.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("A user with this email already exists.")
        if Employee.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("An employee with this email already exists.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")
        username = cleaned_data.get("username")

        if password and confirm_password and password != confirm_password:
            self.add_error("confirm_password", "Passwords do not match.")

        if password:
            validate_password(password, user=get_user_model()(username=username or ""))

        return cleaned_data

    @transaction.atomic
    def save(self):
        user = get_user_model().objects.create_user(
            username=self.cleaned_data["username"],
            email=self.cleaned_data["email"],
            password=self.cleaned_data["password"],
        )
        return Employee.objects.create(
            user=user,
            name=self.cleaned_data["username"],
            department=self.cleaned_data["department"],
            email=self.cleaned_data["email"],
        )


class EmailOrUsernameAuthenticationForm(AuthenticationForm):
    username = UsernameField(
        label="Username or Email",
        widget=forms.TextInput(attrs={"autofocus": True}),
    )

    def clean(self):
        username_or_email = self.cleaned_data.get("username")
        password = self.cleaned_data.get("password")

        if username_or_email and password:
            username = username_or_email
            if "@" in username_or_email:
                user = (
                    get_user_model()
                    .objects.filter(email__iexact=username_or_email)
                    .first()
                )
                if user is not None:
                    username = user.get_username()

            self.user_cache = authenticate(
                self.request,
                username=username,
                password=password,
            )
            if self.user_cache is None:
                raise self.get_invalid_login_error()
            self.confirm_login_allowed(self.user_cache)

        return self.cleaned_data


class AssignmentForm(forms.ModelForm):
    class Meta:
        model = Assignment
        fields = ["employee"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["employee"].queryset = Employee.objects.all().order_by("name")


class MaintenanceLogForm(forms.ModelForm):
    class Meta:
        model = MaintenanceLog
        fields = ["issue_description", "technician", "date", "resolved"]
        widgets = {
            "date": forms.DateInput(attrs={"type": "date"}),
        }
