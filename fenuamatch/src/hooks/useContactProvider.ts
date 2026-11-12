import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/errors';
import { startConversation } from '@/services/messages';

/** Ouvre (ou retrouve) la conversation avec un prestataire puis l'affiche. */
export function useContactProvider() {
  const navigate = useNavigate();
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  async function contact(providerId: string) {
    setPendingId(providerId);
    try {
      const id = await startConversation(providerId);
      navigate(`/messages/${id}`);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setPendingId(null);
    }
  }
  return { contact, pendingId };
}
