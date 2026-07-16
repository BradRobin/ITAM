from django.contrib import messages
from django.shortcuts import redirect
from django.urls import reverse, reverse_lazy
from django.views.generic import CreateView, DeleteView, DetailView, ListView, UpdateView

from .access import AdminRequiredMixin
from .forms import EmployeeCreateForm, EmployeeForm
from .models import Employee
from .services.notifications import add_session_notification


class EmployeeListView(AdminRequiredMixin, ListView):
    model = Employee
    template_name = "inventory/employee_list.html"
    context_object_name = "employees"
    paginate_by = 25


class EmployeeDetailView(AdminRequiredMixin, DetailView):
    model = Employee
    template_name = "inventory/employee_detail.html"
    context_object_name = "employee"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(
            {
                "active_assignments": self.object.assignments.select_related(
                    "asset"
                ).filter(date_returned__isnull=True),
                "assignment_history": self.object.assignments.select_related("asset"),
            }
        )
        return context


class EmployeeCreateView(AdminRequiredMixin, CreateView):
    model = Employee
    form_class = EmployeeCreateForm
    template_name = "inventory/employee_form.html"
    success_url = reverse_lazy("employee_list")

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs.pop("instance", None)
        return kwargs

    def form_valid(self, form):
        self.object = form.save()
        add_session_notification(
            self.request,
            notification_type="success",
            title="New Employee Added",
            message=f'Employee "{self.object.name}" has been added to the system.',
            link=reverse("employee_list"),
            source="employee_creation",
        )

        messages.success(self.request, "Employee created successfully.")
        return redirect(self.get_success_url())


class EmployeeUpdateView(AdminRequiredMixin, UpdateView):
    model = Employee
    form_class = EmployeeForm
    template_name = "inventory/employee_form.html"
    success_url = reverse_lazy("employee_list")


class EmployeeDeleteView(AdminRequiredMixin, DeleteView):
    model = Employee
    template_name = "inventory/employee_confirm_delete.html"
    success_url = reverse_lazy("employee_list")
