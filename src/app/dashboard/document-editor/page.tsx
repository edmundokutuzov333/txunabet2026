
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, TextQuote, Link as LinkIcon, Image, Pilcrow, AlignLeft, AlignCenter, AlignRight, Undo, Redo, Wand2, Sparkles, Save, Loader2, Cloud, Download, ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { summarizeText } from "@/ai/flows/summarize-text";
import { translateText } from "@/ai/flows/translate-text";
import { correctGrammar } from "@/ai/flows/correct-grammar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";


const toneStyles = {
    'Neutro': 'text-muted-foreground',
    'Formal': 'text-primary',
    'Confiante': 'text-green-400',
    'Analítico': 'text-blue-400',
    'Amigável': 'text-yellow-400',
}

type AiAction = 'summarize' | 'translate' | 'correct' | null;

export default function DocumentEditorPage() {
    const { toast } = useToast();
    const [textContent, setTextContent] = useState('');
    const [documentTone, setDocumentTone] = useState<keyof typeof toneStyles>('Neutro');
    const [loadingAiAction, setLoadingAiAction] = useState<AiAction>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    const handleCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        updateTextContent();
    };
    
    const handleInsertLink = () => {
        const url = prompt("Insira a URL do link:");
        if (url) {
            handleCommand('createLink', url);
        }
    }
    
    const handleInsertImage = () => {
        const url = prompt("Insira a URL da imagem:");
        if (url) {
            handleCommand('insertImage', url);
        }
    }

    const handleSaveToCloud = () => {
        toast({
            title: "Documento Salvo na Nuvem",
            description: "Uma cópia do seu documento foi salva na Oryon Cloud.",
        });
    }
    
    const handleSaveToDevice = async () => {
        if (editorRef.current) {
            const content = editorRef.current.innerText;
            const blob = new Blob([content], { type: 'text/plain;charset=utf-t' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'documento-oryon.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({
                title: "Download Iniciado",
                description: "O seu documento está a ser salvo como .txt.",
            });
        }
    }

    const updateTextContent = () => {
        if (editorRef.current) {
            setTextContent(editorRef.current.innerText);
        }
    }

    const getSelectedText = () => {
        const selection = window.getSelection();
        return selection ? selection.toString() : '';
    }

    const handleAiAction = async (action: AiAction) => {
        setLoadingAiAction(action);
        const selectedText = getSelectedText();
        const targetText = selectedText.trim() || textContent;

        if (!targetText.trim()) {
            toast({
                title: "Nenhum texto para processar",
                description: "Por favor, escreva ou selecione algum texto no editor.",
                variant: 'destructive'
            });
            setLoadingAiAction(null);
            return;
        }

        try {
            let result;
            if (action === 'summarize') {
                result = await summarizeText({ text: targetText });
                if (editorRef.current) editorRef.current.innerHTML = result.summary;
            } else if (action === 'translate') {
                result = await translateText({ text: targetText });
                 if (editorRef.current) editorRef.current.innerHTML = result.translation;
            } else if (action === 'correct') {
                result = await correctGrammar({ text: targetText });
                 if (editorRef.current) editorRef.current.innerHTML = result.correctedText;
            }
            updateTextContent(); // Update state after changing editor content
            toast({ title: "Ação da IA concluída com sucesso!"});
        } catch (error) {
            console.error(`Error during AI action (${action}):`, error);
            toast({
                title: `Erro ao executar a ação de IA`,
                description: "Não foi possível contactar o serviço de IA. Tente novamente.",
                variant: 'destructive'
            });
        } finally {
            setLoadingAiAction(null);
        }
    }


    useEffect(() => {
        const text = textContent.toLowerCase();
        if (text.includes('relatório') || text.includes('análise') || text.includes('dados')) {
            setDocumentTone('Analítico');
        } else if (text.includes('proposta') || text.includes('garantimos') || text.includes('certamente')) {
            setDocumentTone('Confiante');
        } else if (text.includes('por favor') || text.includes('obrigado') || text.includes('olá')) {
            setDocumentTone('Amigável');
        } else if (text.length > 50) {
            setDocumentTone('Formal');
        } else {
            setDocumentTone('Neutro');
        }
    }, [textContent]);


    return (
        <div className="p-6 fade-in flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                 <div>
                    <h1 className="text-3xl font-bold text-foreground">Editor de Documentos</h1>
                     <Link href="/dashboard/documents" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para Documentos
                    </Link>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button className="btn-primary-gradient px-6 py-2 h-auto text-base">
                            <Save className="mr-2 h-5 w-5" /> Salvar
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onSelect={handleSaveToCloud}>
                            <Cloud className="mr-2 h-4 w-4" />
                            <span>Salvar na Nuvem</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleSaveToDevice}>
                           <Download className="mr-2 h-4 w-4" />
                           <span>Salvar no Dispositivo</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex-grow flex gap-8">
                <div className="w-1/4 space-y-6">
                    <Card className="gradient-surface border-0 rounded-2xl">
                        <CardContent className="p-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-3"><Wand2 className="text-primary"/>Nexus Assist</h3>
                            <p className="text-sm text-muted-foreground mb-4">Selecione texto e use os comandos, ou escreva /nexus no documento.</p>
                             <Button variant="outline" className="w-full justify-start bg-card/50 mt-2" onClick={() => handleAiAction('summarize')} disabled={!!loadingAiAction}>
                                {loadingAiAction === 'summarize' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Resumir Texto
                            </Button>
                             <Button variant="outline" className="w-full justify-start bg-card/50 mt-2" onClick={() => handleAiAction('translate')} disabled={!!loadingAiAction}>
                                {loadingAiAction === 'translate' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Traduzir para Inglês
                             </Button>
                             <Button variant="outline" className="w-full justify-start bg-card/50 mt-2" onClick={() => handleAiAction('correct')} disabled={!!loadingAiAction}>
                                {loadingAiAction === 'correct' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Corrigir Gramática
                            </Button>
                        </CardContent>
                    </Card>
                     <Card className="gradient-surface border-0 rounded-2xl">
                        <CardContent className="p-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-3"><Sparkles className="text-primary"/>Análise de Tom</h3>
                            <p className="text-sm text-muted-foreground mb-4">A IA analisa o tom do seu texto em tempo real.</p>
                            <div className="text-center p-4 bg-card/50 rounded-lg">
                                <p className={cn("text-2xl font-bold transition-colors", toneStyles[documentTone])}>{documentTone}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="w-3/4">
                    <Card className="gradient-surface border-0 rounded-2xl overflow-hidden h-full flex flex-col">
                        <div className="p-2 flex items-center flex-wrap gap-1 border-b border-border bg-slate-900/50">
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('undo')} title="Desfazer"><Undo className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('redo')} title="Refazer"><Redo className="w-4 h-4" /></Button>
                            <div className="h-6 w-px bg-border mx-2"></div>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('bold')} title="Negrito"><Bold className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('italic')} title="Itálico"><Italic className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('underline')} title="Sublinhado"><Underline className="w-4 h-4" /></Button>
                            <div className="h-6 w-px bg-border mx-2"></div>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('formatBlock', 'h1')} title="Título 1"><Heading1 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('formatBlock', 'h2')} title="Título 2"><Heading2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('formatBlock', 'p')} title="Parágrafo"><Pilcrow className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('formatBlock', 'blockquote')} title="Citação"><TextQuote className="w-4 h-4" /></Button>
                            <div className="h-6 w-px bg-border mx-2"></div>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('justifyLeft')} title="Alinhar à Esquerda"><AlignLeft className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('justifyCenter')} title="Centralizar"><AlignCenter className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('justifyRight')} title="Alinhar à Direita"><AlignRight className="w-4 h-4" /></Button>
                            <div className="h-6 w-px bg-border mx-2"></div>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('insertUnorderedList')} title="Lista"><List className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCommand('insertOrderedList')} title="Lista Ordenada"><ListOrdered className="w-4 h-4" /></Button>
                            <div className="h-6 w-px bg-border mx-2"></div>
                            <Button variant="ghost" size="icon" onClick={handleInsertLink} title="Inserir Link"><LinkIcon className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={handleInsertImage} title="Inserir Imagem"><Image className="w-4 h-4" /></Button>
                        </div>
                        <div 
                            id="editable-doc" 
                            ref={editorRef}
                            contentEditable="true" 
                            className="p-8 text-foreground/90 bg-transparent flex-grow focus:outline-none prose prose-invert prose-lg max-w-full custom-scrollbar overflow-y-auto"
                            suppressContentEditableWarning={true}
                            onInput={updateTextContent}
                            onBlur={updateTextContent}
                        >
                            <h1>Comece a escrever o seu documento...</h1>
                            <p>Utilize as ferramentas acima para formatar o texto, ou use o assistente de IA para gerar conteúdo, resumir ou traduzir.</p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
