
// src/app/page.tsx
'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import TxunaLogo from '@/components/icons/txuna-logo';
import { ArrowRight, Shield, Zap, Users, BarChart3, MessageSquare, Calendar, Target, Trophy, Sparkles, CheckCircle } from 'lucide-react';

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Velocidade Operacional",
      description: "Processos otimizados e fluxos de trabalho acelerados em até 300%"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Gestão por Objetivos",
      description: "Metas claras, acompanhamento em tempo real e resultados mensuráveis"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Colaboração Unificada",
      description: "Conexão perfeita entre todos os departamentos e equipas"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Inteligência de Dados",
      description: "Analytics avançados para decisões estratégicas informadas"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Comunicação Centralizada",
      description: "Canais dedicados por projeto e comunicação direta entre equipas"
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Otimização de Tempo",
      description: "Agendamentos inteligentes e gestão eficiente de prazos"
    }
  ];

  const benefits = [
    "Redução de 65% no tempo de gestão de projetos",
    "Comunicação interna 100% integrada",
    "Relatórios de performance automáticos",
    "Acesso seguro e restrito aos colaboradores",
    "Suporte técnico dedicado 24/7",
    "Atualizações contínuas sem custos adicionais"
  ];

  return (
    <div className="relative z-10">
      {/* Navigation */}
      <nav className="relative z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <TxunaLogo className="w-56 h-16" />
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <a
              href="/login"
              className="group relative px-8 py-3 bg-[hsl(var(--primary))] text-white rounded-full font-semibold overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[hsl(var(--primary))]/20"
            >
              <span className="relative z-10 flex items-center gap-2">
                Acessar Plataforma
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </a>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(260,25%,18%)] border border-[hsl(260,25%,22%)] rounded-full mb-8"
            >
              <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span className="text-sm text-[hsl(0,0%,98%)] font-medium">
                Plataforma Corporativa Txuna Bet
              </span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[hsl(0,0%,98%)] via-[hsl(var(--primary))] to-[hsl(0,0%,98%)] bg-clip-text text-transparent">
                A Nova Era
              </span>
              <br />
              <span className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(90,85%,75%)] bg-clip-text text-transparent">
                da Operação
              </span>
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl md:text-2xl text-[hsl(260,5%,75%)] max-w-4xl mx-auto mb-12 leading-relaxed"
            >
              Desenvolvida pela <span className="text-[hsl(var(--primary))] font-semibold">Oryon</span> 
              {" "}exclusivamente para a excelência operacional da Txuna Bet.
              <span className="block mt-2 text-lg">
                Mais do que uma plataforma, o centro nervoso da sua produtividade.
              </span>
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center items-center mb-16"
            >
              <a
                href="/login"
                className="group relative px-12 py-4 bg-[hsl(var(--primary))] text-[hsl(260,25%,10%)] rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[hsl(var(--primary))]/30"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Iniciar Sessão
                  <Trophy className="w-5 h-5" />
                </span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              </a>
            </motion.div>

            {/* Benefits List */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + index * 0.1 }}
                  className="flex items-start h-full gap-3 p-4 bg-[hsl(260,25%,12%)] border border-[hsl(260,25%,18%)] rounded-xl"
                >
                  <CheckCircle className="w-5 h-5 text-[hsl(var(--primary))] flex-shrink-0" />
                  <span className="text-sm text-left text-[hsl(260,5%,75%)] font-medium">
                    {benefit}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[hsl(0,0%,98%)] to-[hsl(var(--primary))] bg-clip-text text-transparent">
                Potência
              </span>
              <span className="text-[hsl(0,0%,98%)]"> Operacional</span>
            </h2>
            <p className="text-xl text-[hsl(260,5%,75%)] max-w-2xl mx-auto">
              Ferramentas corporativas projetadas para a excelência da Txuna Bet. 
              Cada recurso é uma vantagem competitiva interna.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="group p-8 bg-[hsl(260,25%,12%)] border border-[hsl(260,25%,18%)] rounded-3xl hover:border-[hsl(var(--primary))] hover:transform hover:scale-105 transition-all duration-500"
              >
                <div className="w-16 h-16 mb-6 rounded-2xl bg-[hsl(260,25%,15%)] border border-[hsl(260,25%,22%)] flex items-center justify-center text-[hsl(var(--primary))] group-hover:bg-[hsl(var(--primary))] group-hover:text-[hsl(260,25%,10%)] transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-[hsl(0,0%,98%)] mb-3">
                  {feature.title}
                </h3>
                <p className="text-[hsl(260,5%,75%)] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-[hsl(0,0%,98%)]">Desenvolvido pela</span>
              <span className="block bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(90,85%,75%)] bg-clip-text text-transparent">
                Oryon
              </span>
            </h2>
            
            <p className="text-xl text-[hsl(260,5%,75%)] mb-8 max-w-2xl mx-auto">
              Uma parceria estratégica para elevar a excelência operacional da Txuna Bet. 
              Tecnologia de ponta focada em resultados reais para a sua equipa.
            </p>

            <div className="flex flex-col gap-4 justify-center items-center">
              <a
                href="/login"
                className="group relative px-12 py-4 bg-[hsl(var(--primary))] text-[hsl(260,25%,10%)] rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[hsl(var(--primary))]/40"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Acessar Plataforma
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              </a>

              <div className="flex items-center gap-2 text-sm text-[hsl(260,5%,65%)]">
                <Shield className="w-4 h-4" />
                Ambiente corporativo 100% seguro e exclusivo para colaboradores Txuna Bet
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-[hsl(260,25%,18%)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col items-center md:items-start mb-6 md:mb-0">
              <TxunaLogo className="w-32 h-10 mb-4" />
              <p className="text-[hsl(260,5%,65%)] text-sm text-center md:text-left">
                Plataforma de gestão interna desenvolvida pela Oryon
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-[hsl(260,5%,65%)] text-sm">
                Exclusivo para Colaboradores Txuna Bet
              </p>
              <p className="text-[hsl(260,5%,55%)] text-xs mt-2">
                © 2025 Txuna Bet. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
