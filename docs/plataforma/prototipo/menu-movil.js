/**
 * Menu movil, compartido por las cinco pantallas.
 *
 * Por que existe como archivo y no copiado en cada pagina: estaba implementado
 * en dos de las cinco, y en las otras tres el boton hamburguesa existia, se
 * veia, respondia al foco... y no hacia nada. Por debajo de 920 px los seis
 * enlaces de navegacion eran inalcanzables en esas tres pantallas.
 *
 * El detalle que lo hace doblemente malo: es exactamente el defecto que el
 * diagnostico del sitio actual habia senalado --- «el boton hamburguesa no
 * tiene handler, en movil no hay navegacion»--- reproducido en el prototipo que
 * venia a corregirlo. Un componente duplicado a mano se implementa completo en
 * el primero y a medias en el resto; por eso ahora hay un solo archivo.
 *
 * Accesibilidad: `aria-expanded` refleja el estado real, `aria-controls` apunta
 * al menu, Escape cierra y devuelve el foco al boton, y un clic fuera cierra.
 */
(function () {
  var burger = document.querySelector(".burger");
  var nav = document.querySelector(".nav");
  if (!burger || !nav) return;

  if (!nav.id) nav.id = "nav-principal";
  burger.setAttribute("aria-controls", nav.id);

  function abierto() {
    return burger.getAttribute("aria-expanded") === "true";
  }

  function cerrar() {
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Abrir menú");
    nav.removeAttribute("style");
  }

  function abrir() {
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Cerrar menú");
    nav.style.display = "flex";
    nav.style.flexDirection = "column";
    nav.style.alignItems = "flex-start";
    nav.style.position = "absolute";
    nav.style.top = "72px";
    nav.style.left = "0";
    nav.style.right = "0";
    nav.style.background = "var(--bg-page)";
    nav.style.borderBottom = "1px solid var(--rule)";
    nav.style.padding = "1rem 24px";
    nav.style.gap = ".5rem";
    nav.style.zIndex = "40";
  }

  burger.addEventListener("click", function (e) {
    e.stopPropagation();
    if (abierto()) cerrar(); else abrir();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && abierto()) {
      cerrar();
      burger.focus();
    }
  });

  document.addEventListener("click", function (e) {
    if (abierto() && !nav.contains(e.target) && e.target !== burger) cerrar();
  });

  // Al volver a ancho de escritorio, el menu desplegado dejaria estilos en
  // linea que pisan la regla de la media query. Se limpian.
  var ancho = window.matchMedia("(min-width: 920px)");
  var alCambiar = function (m) { if (m.matches && abierto()) cerrar(); };
  if (ancho.addEventListener) ancho.addEventListener("change", alCambiar);
  else if (ancho.addListener) ancho.addListener(alCambiar);
})();
