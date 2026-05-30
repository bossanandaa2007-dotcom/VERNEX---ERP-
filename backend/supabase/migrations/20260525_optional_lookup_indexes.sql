create index if not exists librarian_books_title_idx
on public.librarian_books (title);

create index if not exists librarian_books_author_idx
on public.librarian_books (author);

create index if not exists assignments_class_deadline_idx
on public.assignments (class_name, deadline);

create index if not exists events_date_idx
on public.events (date);
