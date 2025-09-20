from __future__ import annotations

from rest_framework.pagination import CursorPagination
from rest_framework.response import Response


class UICursorPagination(CursorPagination):
    page_size = 50
    max_page_size = 500
    ordering = "-timestamp"
    cursor_query_param = "cursor"

    def get_paginated_response(self, data):
        return Response(
            {
                "results": data,
                "nextCursor": self.get_next_link(),
                "prevCursor": self.get_previous_link(),
                "count": self.page_size,
            }
        )

