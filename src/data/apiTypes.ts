export interface ApiCard {
  card_set_id: string
  card_name: string
  card_type: string
  card_color: string
  card_cost: string | number | null
  card_power: string | number | null
  counter_amount: string | number | null
  life: string | number | null
  attribute: string | null
  sub_types: string | null
  card_text: string | null
  card_image: string

}


export interface StoredCard extends ApiCard {
  image_file: string

}


export interface DeckFile {
  id: string
  name: string
  leader: string
  cards: { id: string; count: number }[]

}
