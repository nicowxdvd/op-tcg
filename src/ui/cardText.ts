import { loadCards } from '../data'

const BLOCKER = '(Después de que tu oponente declare un ataque, puedes reposar esta carta para que sea el nuevo objetivo del ataque.)'
const RUSH    = '(Esta carta puede atacar el turno en que se juega.)'
const COST    = '(Puedes reposar la cantidad indicada de cartas DON!! de tu área de coste.)'

const SPANISH: Record<string, string> = {
  'ST01-001': '[Activate: Main] [Once Per Turn] Da hasta 1 carta DON!! reposada a este Líder o a 1 de tus Personajes.',
  'ST01-002': '[DON!! x2] [When Attacking] Tu oponente no puede activar un Personaje [Blocker] con 5000 de poder o más durante este combate. [Trigger] Juega esta carta.',
  'ST01-004': `[DON!! x2] Este Personaje gana [Rush]. ${RUSH}`,
  'ST01-005': '[DON!! x1] [When Attacking] Hasta 1 de tus cartas de Líder o Personaje, aparte de esta carta, gana +1000 de poder durante este turno.',
  'ST01-006': `[Blocker] ${BLOCKER}`,
  'ST01-007': '[Activate: Main] [Once Per Turn] Da hasta 1 carta DON!! reposada a tu Líder o a 1 de tus Personajes.',
  'ST01-011': '[On Play] Da hasta 2 cartas DON!! reposadas a tu Líder o a 1 de tus Personajes.',
  'ST01-012': `[Rush] ${RUSH} [DON!! x2] [When Attacking] Tu oponente no puede activar [Blocker] durante este combate.`,
  'ST01-013': '[DON!! x1] Este Personaje gana +1000 de poder.',
  'ST01-014': '[Counter] Hasta 1 de tus cartas de Líder o Personaje gana +3000 de poder durante este combate. [Trigger] Hasta 1 de tus cartas de Líder o Personaje gana +1000 de poder durante este turno.',
  'ST01-015': '[Main] Derrota (K.O.) hasta 1 Personaje de tu oponente con 6000 de poder o menos. [Trigger] Activa el efecto [Main] de esta carta.',
  'ST01-016': '[Main] Elige hasta 1 de tus cartas de Líder o Personaje de tipo {Straw Hat Crew}. Tu oponente no puede activar [Blocker] si ese Líder o Personaje ataca durante este turno. [Trigger] Derrota (K.O.) hasta 1 Personaje [Blocker] de tu oponente con coste 3 o menos.',
  'ST01-017': '[Activate: Main] Puedes reposar este Stage: hasta 1 carta de Líder o Personaje de tipo {Straw Hat Crew} en tu campo gana +1000 de poder durante este turno.',
  'ST02-001': `[Activate: Main] [Once Per Turn] (3) ${COST} Puedes descartar 1 carta de tu mano: Pon este Líder como activo.`,
  'ST02-003': '[DON!! x1] Si tienes 3 o más Personajes, esta carta gana +2000 de poder.',
  'ST02-004': `[Blocker] ${BLOCKER}`,
  'ST02-005': '[On Play] Derrota (K.O.) hasta 1 Personaje reposado de tu oponente con coste 3 o menos. [Trigger] Juega esta carta.',
  'ST02-007': `[Activate: Main] (1) ${COST} Puedes reposar esta carta: Mira 5 cartas de la parte superior de tu mazo; revela hasta 1 carta de tipo "Supernovas" y añádela a tu mano. Luego, coloca el resto al fondo de tu mazo en cualquier orden.`,
  'ST02-008': '[DON!! x1] [When Attacking] Reposa hasta 1 carta DON!! de tu oponente.',
  'ST02-009': '[On Play] Pon como activo hasta 1 de tus Personajes reposados de tipo "Supernovas" o "Heart Pirates" con coste 5 o menos.',
  'ST02-010': '[DON!! x1] [Once Per Turn] [Your Turn] Si este Personaje combate contra un Personaje de tu oponente, pon esta carta como activa.',
  'ST02-013': `[Blocker] ${BLOCKER} [DON!! x1] [End of Your Turn] Pon esta carta como activa. Esta carta tiene errata oficial.`,
  'ST02-014': '[DON!! x1] [Your Turn] Si este Personaje está reposado, tus Líderes y Personajes de tipo "Supernovas" o "Navy" ganan +1000 de poder.',
  'ST02-015': '[Counter] Hasta 1 de tus cartas de Líder o Personaje gana +2000 de poder durante este combate. Luego, pon como activas hasta 1 de tus cartas DON!!. [Trigger] Pon como activas hasta 2 de tus cartas DON!!.',
  'ST02-016': '[Counter] Hasta 1 de tus cartas de Líder o Personaje gana +4000 de poder durante este combate. Luego, pon como activas hasta 1 de tus cartas DON!!.',
  'ST02-017': '[Main] Reposa hasta 1 Personaje de tu oponente.',
  'OP15-088': 'Este Personaje gana +6 de coste. [On Play] Puedes descartar 3 cartas de la parte superior de tu mazo: Juega hasta 1 carta de Personaje de tipo {Straw Hat Crew} con coste 2 o menos desde tu zona de descarte.',
  'OP17-039': '[When Attacking] Puedes descartar 1 carta de tu mano: Revela 1 carta de la parte superior de tu mazo. Si el tipo de la carta revelada incluye "Rocks Pirates", roba 2 cartas.',
  'OP17-040': '[On Play] Roba 1 carta. [Once Per Turn] Cuando tu Líder con un tipo que incluya "Rocks Pirates" ataca o es atacado, puedes descartar 1 carta de tu mano para activar este efecto. Tu Líder gana +3000 de poder durante este combate.',
  'OP17-041': '[Blocker] [On Play] Puedes descartar 1 carta de tu mano: Coloca al fondo del mazo de su dueño, en el orden que él elija, todos los Personajes de tu oponente con coste base 1.',
  'OP17-042': '[Blocker] [On Play] Puedes revelar 3 cartas de tu mano con un tipo que incluya "Rocks Pirates": Da +3000 de poder a hasta 1 Personaje de tu oponente durante este turno.',
  'OP17-044': 'Si el tipo de tu Líder incluye "Rocks Pirates" y este Personaje está reposado, tu oponente no puede atacar a ninguna carta aparte del Personaje [Captain John]. [Activate: Main] Puedes reposar este Personaje: Roba 1 carta y descarta 1 carta de tu mano.',
  'OP17-045': 'Si uno de tus Personajes fuera a ser retirado del campo por un efecto de tu oponente, puedes descartar 2 cartas de tu mano en su lugar. [On Play] Roba 1 carta.',
  'OP17-046': `[Blocker] ${BLOCKER} [On Play] Coloca al fondo del mazo de su dueño hasta 1 Personaje con coste 5 o menos.`,
  'OP17-048': '[Rush: Character] [When Attacking]/[On Your Opponent\'s Attack] [Once Per Turn] Puedes descartar 1 carta de tu mano con un tipo que incluya "Rocks Pirates": Da -3000 de poder a hasta 1 Personaje de tu oponente durante este turno.',
  'OP17-049': '[On Play] Tu oponente elige una opción: • Robar 2 cartas. • Descartar 2 cartas de su mano. [On Your Opponent\'s Attack] [Once Per Turn] Puedes descartar 1 carta de tu mano: Hasta 1 de tus cartas de Líder o Personaje gana +1000 de poder durante este combate.',
  'OP17-050': '[On Play] Mira 2 cartas de la parte superior de tu mazo, reordénalas y colócalas en la parte superior o al fondo del mazo. Luego, roba 1 carta.',
  'OP17-052': '[On Play] Añade a tu mano hasta 1 Evento azul con coste 0 de tu zona de descarte.',
  'OP17-054': '[On Play] Hasta 1 Personaje de tu oponente con coste base 6 o menos no puede atacar hasta el final de la próxima Fase Final de tu oponente. [Activate: Main] Puedes reposar 3 de tus cartas DON!! y este Personaje: Hasta 1 Personaje de tu oponente no puede atacar hasta el final de la próxima Fase Final de tu oponente.',
  'OP17-055': '[Main] Puedes reposar 1 de tus cartas DON!!: Hasta 1 de tus [Rocks.D.Xebec] gana [Unblockable] durante este turno. [Counter] Hasta 1 de tus Líderes con un tipo que incluya "Rocks Pirates" o hasta 1 de tus Personajes con un tipo que incluya "Rocks Pirates" gana +2000 de poder durante este combate.',
  'OP17-056': '[Main] Puedes reposar 5 de tus cartas DON!!: Devuelve a la mano de su dueño hasta 1 Personaje con coste 6 o menos. [Counter] Hasta 1 de tus Líderes con un tipo que incluya "Rocks Pirates" o hasta 1 de tus Personajes con un tipo que incluya "Rocks Pirates" gana +2000 de poder durante este combate.',
  'OP17-079': `Todos tus Personajes con coste 12 o más ganan [Blocker]. ${BLOCKER}`,
  'OP17-080': 'Si hay un Personaje con coste 12 o más, este Personaje gana +3000 de poder. [On Play] Mira 3 cartas de la parte superior de tu mazo; revela hasta 1 carta de tipo {Elbaph} y añádela a tu mano. Luego, descarta el resto.',
  'OP17-081': 'Si tu Líder es de tipo {Elbaph}, este Personaje gana +12 de coste. [On Play] Puedes descartar 1 carta de tu mano: Añade a tu mano hasta 1 carta de Personaje con coste 8 o menos, aparte de [Gerd], de tu zona de descarte.',
  'OP17-082': 'Si hay un Personaje con coste 12 o más, este Personaje gana +3000 de poder. [On Play] Roba 2 cartas y descarta 2 cartas de tu mano.',
  'OP17-084': `[On Play] Si hay un Personaje con coste 12 o más, hasta 1 de tus Personajes gana [Unblockable] durante este turno. (Esta carta no puede ser bloqueada.)`,
  'OP17-086': '[On Play] Puedes descartar 1 carta de tipo {Elbaph} de tu mano: Roba 2 cartas.',
  'OP17-087': 'Si hay un Personaje con coste 12 o más, este Personaje gana +3000 de poder. [On Play] Si hay un Personaje con coste 12 o más, da -3000 de poder a hasta 1 Personaje de tu oponente durante este turno.',
  'OP17-089': 'Este Personaje gana +12 de coste. [On Play] Mira 3 cartas de la parte superior de tu mazo; revela hasta 1 carta de tipo {Elbaph} y añádela a tu mano. Luego, descarta el resto.',
  'OP17-093': 'Si hay un Personaje con coste 12 o más, este Personaje gana [Rush]. [On Play] Roba 1 carta y juega hasta 1 carta de Personaje con coste 2 o menos desde tu zona de descarte.',
  'OP17-094': 'Si tu Líder es de tipo {Elbaph}, este Personaje gana +12 de coste.',
  'OP17-095': 'Si hay un Personaje con coste 12 o más, este Personaje gana +3000 de poder. Si uno de tus Personajes fuera a ser retirado del campo por un efecto de tu oponente, puedes colocar 3 cartas de tu zona de descarte al fondo de tu mazo, en cualquier orden, en su lugar.',
  'OP17-118': 'Si solo tienes Personajes sin Counter, esta carta en tu mano tiene un Counter de +2000. [On Play] Roba 1 carta y juega desde tu mano hasta 2 cartas de tipo {Rocks Pirates} con nombres distintos y coste total 9 o menos.',
  'OP17-119': 'Este Personaje gana +12 de coste y, si es el turno de tu oponente, gana +3000 de poder. [On Play] Derrota (K.O.) a los Personajes de tu oponente con coste total 4 o menos.',
  'ST14-017': 'Todos tus Personajes negros de tipo "Straw Hat Crew" ganan +1 de coste. [On Play] Si tu Líder es de tipo "Straw Hat Crew", roba 1 carta.'
}

const TEXTS = new Map(loadCards().map(card => [card.card_set_id, card.card_text && card.card_text !== 'NULL' ? (SPANISH[card.card_set_id] ?? card.card_text) : '']))


export function cardText(defId: string): string {
  return TEXTS.get(defId) ?? ''

}
