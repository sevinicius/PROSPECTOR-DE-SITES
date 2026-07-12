// Follow-ups — propostas paradas há 4+ dias.
import { followups } from '../estado.js';
import { card } from '../ui.js';

export function vFollowup() {
  const fu = followups();
  return '<div class="painel"><h2>Propostas aguardando follow-up</h2>'
    + (fu.length ? fu.map(card).join('') : '<div class="vazio">Nenhum follow-up pendente.</div>')
    + '</div>';
}
