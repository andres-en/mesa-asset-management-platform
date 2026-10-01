"""Every endpoint is documented in the Swagger (flasgger) spec."""

from __future__ import annotations

import re

IGNORED_PREFIXES = ("/apidocs", "/apispec", "/flasgger_static", "/oauth2-redirect", "/static")


def test_every_route_is_in_the_swagger_spec(app, client):
    spec_paths = client.get("/apispec_1.json").get_json()["paths"]
    documented = {(path, method) for path, item in spec_paths.items() for method in item}
    routes = set()
    for rule in app.url_map.iter_rules():
        if rule.rule.startswith(IGNORED_PREFIXES):
            continue
        path = re.sub(r"<(?:[^:<>]+:)?([^<>]+)>", r"{\1}", rule.rule)
        routes |= {(path, m.lower()) for m in rule.methods - {"HEAD", "OPTIONS"}}
    assert routes - documented == set()


def test_swagger_ui_is_served(client):
    assert client.get("/apidocs/").status_code == 200
    assert client.get("/apispec_1.json").get_json()["info"]["title"] == "Mesa API"
