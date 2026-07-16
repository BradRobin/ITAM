from django.shortcuts import render


def error_bad_request(request, exception=None):
    return render(
        request,
        "inventory/error.html",
        {
            "status_code": 400,
            "title": "Bad Request",
            "message": "The request could not be processed. Please try again.",
        },
        status=400,
    )


def error_permission_denied(request, exception=None):
    return render(
        request,
        "inventory/error.html",
        {
            "status_code": 403,
            "title": "Access Denied",
            "message": "You do not have permission to access this page.",
        },
        status=403,
    )


def error_not_found(request, exception=None):
    return render(
        request,
        "inventory/error.html",
        {
            "status_code": 404,
            "title": "Page Not Found",
            "message": "The page you are looking for does not exist.",
        },
        status=404,
    )


def error_server_error(request):
    return render(
        request,
        "inventory/error.html",
        {
            "status_code": 500,
            "title": "Something Went Wrong",
            "message": "We hit an unexpected issue. Please try again shortly.",
        },
        status=500,
    )
