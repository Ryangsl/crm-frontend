import { Alert } from '@/components/ui/Alert';

// Mensagem padrao para um 403 OUTSIDE_BUSINESS_HOURS em telas de Leads e Conversas (D-082). Nao
// oferece "tentar novamente": repetir a chamada nao muda o resultado ate o horario abrir ou uma
// liberacao excepcional ser concedida.
export function OutsideBusinessHoursAlert() {
  return (
    <Alert tone="warning" title="Fora do horário de funcionamento">
      O acesso a Leads e Conversas está indisponível neste horário. Tente novamente dentro do
      horário de funcionamento ou peça uma liberação excepcional a um Admin ou Gerente.
    </Alert>
  );
}
