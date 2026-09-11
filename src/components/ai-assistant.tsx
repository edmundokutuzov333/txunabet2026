'use client';

import { useState, useRef, useEffect } from 'react';
import { chat, ChatMessage, ChatHistory } from '@/ai/flows/chat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, User, Wand2, Paperclip, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function AiAssistant({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatHistory>([]);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history, loading]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      toast({
        title: 'Ficheiro não suportado',
        description: 'Por favor, anexe apenas ficheiros de imagem.',
        variant: 'destructive',
      });
    }
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim() && !attachedImage) {
      toast({
        title: 'Nenhum conteúdo',
        description: 'Por favor, insira uma pergunta ou anexe uma imagem.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    const currentPrompt = prompt;
    const currentImage = attachedImage;
    
    const userMessage: ChatMessage = { role: 'user', content: [{ text: currentPrompt }] };
    if (currentImage) {
        const mimeType = currentImage.match(/data:(.*);base64,/)?.[1] || 'image/jpeg';
        userMessage.content.push({ media: { contentType: mimeType, url: currentImage } });
    }
    setHistory(prevHistory => [...prevHistory, userMessage]);
    
    setPrompt('');
    setAttachedImage(null);

    try {
      const response = await chat({
        history: history,
        prompt: currentPrompt,
        imageUrl: currentImage || undefined,
      });

      const modelMessage: ChatMessage = { role: 'model', content: [{ text: response.response }] };
      setHistory(prevHistory => [...prevHistory, modelMessage]);

    } catch (error: any) {
      console.error('Error with chat flow:', error);
      const errorMessage = error.message || 'Ocorreu um erro desconhecido.';
      const modelErrorMessage: ChatMessage = { role: 'model', content: [{ text: `Desculpe, ocorreu um erro ao contactar a IA. Por favor, verifique a sua chave de API e tente novamente.\n\nDetalhes: ${error.message}` }] };
      setHistory(prevHistory => [...prevHistory, modelErrorMessage]);
       toast({
        title: 'Erro de IA',
        description: 'Não foi possível obter uma resposta da IA. Verifique a consola para mais detalhes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gradient-surface border-primary/50 max-w-2xl p-0 flex flex-col h-[70vh]">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Bot className="h-8 w-8 text-primary" />
            OryonAI Assistant
          </DialogTitle>
          <DialogDescription>
            Converse com a IA. Faça perguntas, anexe imagens, peça resumos e muito mais.
          </DialogDescription>
        </DialogHeader>

        <div ref={chatContainerRef} className="flex-grow overflow-y-auto custom-scrollbar px-6 space-y-6">
          {history.length === 0 && !loading && (
            <div className="text-center text-muted-foreground pt-10">
              <Wand2 className="mx-auto h-12 w-12 text-primary/50" />
              <p className="mt-4">Comece a conversa com a OryonAI. Como posso ajudar?</p>
            </div>
          )}
          {history.map((message, index) => (
            <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
               {message.role === 'model' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
               <div className={`max-w-xl p-4 rounded-xl whitespace-pre-wrap text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card/50'}`}>
                 {message.content.map((part, partIndex) => {
                    if (part.text) return <p key={partIndex}>{part.text}</p>;
                    if (part.media?.url) return <Image key={partIndex} src={part.media.url} alt="Attached image" width={200} height={200} className="rounded-lg mt-2"/>;
                    return null;
                 }).filter(Boolean)}
               </div>
               {message.role === 'user' && <User className="h-6 w-6 text-foreground flex-shrink-0" />}
            </div>
          ))}
          {loading && (
             <div className="flex items-start gap-4">
                <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="max-w-xl p-4 rounded-xl bg-card/50">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border mt-auto">
            {attachedImage && (
              <div className="relative w-24 h-24 mb-2">
                <Image src={attachedImage} alt="Preview" layout="fill" objectFit="cover" className="rounded-lg"/>
                <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setAttachedImage(null)}>
                  <X className="h-4 w-4"/>
                </Button>
              </div>
            )}
            <div className="relative">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip />
                </Button>
                <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendPrompt()}
                    placeholder="Pergunte qualquer coisa à OryonAI..."
                    className="pl-12 pr-24 p-3 h-auto rounded-xl bg-card/80 border-border focus:border-primary placeholder-muted-foreground"
                    disabled={loading}
                />
                <Button onClick={handleSendPrompt} disabled={loading} className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary-gradient py-2 h-auto text-sm font-semibold">
                {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : "Enviar"}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
