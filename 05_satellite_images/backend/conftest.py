"""
conftest.py
-----------
Configuración de pytest para el backend de satellite_images.

Registra stubs de los módulos externos (planetary_computer, pystac_client)
que no están instalados en el entorno de CI/test, de modo que los tests
unitarios que mockean _do_search puedan importar core.search sin error.
"""

import sys
import types


def _stub_module(name: str, **attrs) -> types.ModuleType:
    """Crea un módulo stub con los atributos indicados y lo registra en sys.modules."""
    mod = types.ModuleType(name)
    for k, v in attrs.items():
        setattr(mod, k, v)
    sys.modules[name] = mod
    return mod


# Solo registrar stubs si los módulos reales no están disponibles
if "planetary_computer" not in sys.modules:
    try:
        import planetary_computer  # noqa: F401
    except ImportError:
        _stub_module("planetary_computer", sign_inplace=lambda x: x)

if "pystac_client" not in sys.modules:
    try:
        import pystac_client  # noqa: F401
    except ImportError:
        client_stub = _stub_module("pystac_client")
        # Client.open stub
        client_class = type("Client", (), {"open": staticmethod(lambda *a, **kw: None)})
        client_stub.Client = client_class
