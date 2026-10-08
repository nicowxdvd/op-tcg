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
  'ST02-017': '[Main] Reposa hasta 1 Personaje de tu oponente.'
}

const TEXTS = new Map(loadCards().map(card => [card.card_set_id, card.card_text ? (SPANISH[card.card_set_id] ?? card.card_text) : '']))


export function cardText(defId: string): string {
  return TEXTS.get(defId) ?? ''

}
