import socket

from django.test import RequestFactory

from app.common import net_utils


def setup_function():
    net_utils.rdns.cache_clear()


def test_get_client_ip_uses_x_forwarded_for():
    request = RequestFactory().get('/', HTTP_X_FORWARDED_FOR='198.51.100.2, 203.0.113.9', REMOTE_ADDR='203.0.113.10')
    assert net_utils.get_client_ip(request) == '198.51.100.2'


def test_get_client_ip_falls_back_to_remote_addr():
    request = RequestFactory().get('/', REMOTE_ADDR='192.0.2.5')
    assert net_utils.get_client_ip(request) == '192.0.2.5'


def test_rdns_success(monkeypatch):
    def fake_gethostbyaddr(ip):
        assert ip == '198.51.100.10'
        return ('host.example.com', [], [])

    monkeypatch.setattr(net_utils.socket, 'gethostbyaddr', fake_gethostbyaddr)

    assert net_utils.rdns('198.51.100.10') == 'host.example.com'


def test_rdns_failure(monkeypatch):
    def fake_gethostbyaddr(ip):
        raise socket.herror

    monkeypatch.setattr(net_utils.socket, 'gethostbyaddr', fake_gethostbyaddr)

    assert net_utils.rdns('198.51.100.11') is None


def test_resolve_client_hostname_handles_none():
    assert net_utils.resolve_client_hostname(None) is None
