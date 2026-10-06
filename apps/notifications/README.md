# notifications  (Phase 5 - not installed yet)
In-app/email/SMS/WhatsApp behind one provider interface (Celery + Redis).
Hook point: `applications.services.change_application_status` already writes an `ApplicationEvent`;
emit notifications from there (or from a post-commit signal) rather than from views.
