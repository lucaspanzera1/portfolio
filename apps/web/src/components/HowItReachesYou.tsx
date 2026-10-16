import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';

interface HowItReachesYouProps {
  lang: 'EN' | 'PT';
}

type Lang = 'EN' | 'PT';
type FlowId = 'request' | 'deploy';

interface Step {
  icon: string;
  title: Record<Lang, string>;
  tag: string;
  description: Record<Lang, string>;
}

interface Zone {
  label: Record<Lang, string>;
  steps: Step[];
}

interface Flow {
  tab: Record<Lang, string>;
  intro: Record<Lang, string>;
  facts: { value: string; label: Record<Lang, string> }[];
  zones: Zone[];
}

const flows: Record<FlowId, Flow> = {
  request: {
    tab: { EN: 'Your request', PT: 'Sua requisição' },
    intro: {
      EN: 'This page is not on a cloud provider. It runs on a server in my homelab, and Cloudflare is the only door in from the internet.',
      PT: 'Esta página não está em nenhum provedor de nuvem. Ela roda num servidor do meu homelab, e a Cloudflare é a única porta de entrada vinda da internet.',
    },
    facts: [
      { value: '0', label: { EN: 'open ports on my router', PT: 'portas abertas no meu roteador' } },
      { value: '1', label: { EN: 'container for this site', PT: 'container pra este site' } },
    ],
    zones: [
      {
        label: { EN: 'Internet', PT: 'Internet' },
        steps: [
          {
            icon: 'language',
            title: { EN: 'Your browser', PT: 'Seu navegador' },
            tag: 'lucaspanzera.com',
            description: {
              EN: 'The domain resolves through Cloudflare DNS. The IP you get back belongs to Cloudflare, not to my house.',
              PT: 'O domínio é resolvido pelo DNS da Cloudflare. O IP que volta é da Cloudflare, não da minha casa.',
            },
          },
        ],
      },
      {
        label: { EN: 'Cloudflare', PT: 'Cloudflare' },
        steps: [
          {
            icon: 'cloud',
            title: { EN: 'Cloudflare edge', PT: 'Borda da Cloudflare' },
            tag: 'TLS · CDN · WAF',
            description: {
              EN: 'The nearest Cloudflare data center terminates HTTPS, filters malicious traffic and answers from cache whenever it can.',
              PT: 'O data center da Cloudflare mais próximo termina o HTTPS, filtra tráfego malicioso e responde do cache sempre que pode.',
            },
          },
          {
            icon: 'cable',
            title: { EN: 'Cloudflare Tunnel', PT: 'Cloudflare Tunnel' },
            tag: 'outbound-only',
            description: {
              EN: 'Nothing on my network accepts connections from outside. The homelab opens an encrypted connection out to Cloudflare, and your request comes back down through it.',
              PT: 'Nada na minha rede aceita conexão vinda de fora. O homelab abre uma conexão criptografada de saída até a Cloudflare, e a sua requisição volta por dentro dela.',
            },
          },
        ],
      },
      {
        label: { EN: 'Homelab', PT: 'Homelab' },
        steps: [
          {
            icon: 'dns',
            title: { EN: 'Proxmox host', PT: 'Host Proxmox' },
            tag: 'cloudflared',
            description: {
              EN: 'A physical server running Proxmox. The cloudflared daemon lives here and hands the request to the right container on the internal network.',
              PT: 'Um servidor físico rodando Proxmox. O cloudflared fica aqui e entrega a requisição pro container certo na rede interna.',
            },
          },
          {
            icon: 'deployed_code',
            title: { EN: 'LXC container', PT: 'Container LXC' },
            tag: 'nginx',
            description: {
              EN: 'A lightweight Linux container dedicated to this site. nginx serves the React build directly and forwards API calls.',
              PT: 'Um container Linux leve, dedicado a este site. O nginx serve o build do React direto e encaminha as chamadas da API.',
            },
          },
          {
            icon: 'api',
            title: { EN: 'NestJS API', PT: 'API NestJS' },
            tag: 'systemd · MongoDB',
            description: {
              EN: 'Articles, views and upvotes come from a NestJS service with a capped memory budget, backed by MongoDB.',
              PT: 'Artigos, visualizações e upvotes vêm de um serviço NestJS com limite de memória, apoiado no MongoDB.',
            },
          },
        ],
      },
    ],
  },
  deploy: {
    tab: { EN: 'A deploy', PT: 'Um deploy' },
    intro: {
      EN: 'Changes reach production without me opening a terminal on the server. The only manual step is clicking merge.',
      PT: 'As mudanças chegam em produção sem eu abrir um terminal no servidor. A única etapa manual é clicar em merge.',
    },
    facts: [
      { value: '1', label: { EN: 'manual step: the merge', PT: 'etapa manual: o merge' } },
      { value: '0', label: { EN: 'shells the deploy key can open', PT: 'shells que a chave de deploy abre' } },
    ],
    zones: [
      {
        label: { EN: 'GitHub', PT: 'GitHub' },
        steps: [
          {
            icon: 'commit',
            title: { EN: 'Push to develop', PT: 'Push na develop' },
            tag: 'git push',
            description: {
              EN: 'Every change starts as a commit on the develop branch.',
              PT: 'Toda mudança começa como um commit na branch develop.',
            },
          },
          {
            icon: 'build',
            title: { EN: 'Build check', PT: 'Validação do build' },
            tag: 'GitHub Actions',
            description: {
              EN: 'Actions installs the dependencies and compiles both the web app and the API. If anything breaks, the flow stops here.',
              PT: 'O Actions instala as dependências e compila o site e a API. Se algo quebrar, o fluxo para aqui.',
            },
          },
          {
            icon: 'merge',
            title: { EN: 'Automatic pull request', PT: 'Pull request automático' },
            tag: 'develop → main',
            description: {
              EN: 'With a green build, a pull request to main opens by itself. Merging it starts the deploy.',
              PT: 'Com o build verde, um pull request pra main abre sozinho. O merge dispara o deploy.',
            },
          },
        ],
      },
      {
        label: { EN: 'Cloudflare', PT: 'Cloudflare' },
        steps: [
          {
            icon: 'key',
            title: { EN: 'Cloudflare Access', PT: 'Cloudflare Access' },
            tag: 'service token',
            description: {
              EN: 'The deploy job proves who it is to Cloudflare Access with a service token. Without it, the SSH entrance does not even answer.',
              PT: 'O job de deploy se identifica pro Cloudflare Access com um service token. Sem ele, a entrada SSH nem responde.',
            },
          },
        ],
      },
      {
        label: { EN: 'Homelab', PT: 'Homelab' },
        steps: [
          {
            icon: 'shield',
            title: { EN: 'Bastion', PT: 'Bastion' },
            tag: 'forward-only',
            description: {
              EN: 'A container whose only job is relaying SSH to an allow-list of internal machines. Its user has no shell, so a leaked key cannot run commands there.',
              PT: 'Um container que só repassa SSH pra uma lista fechada de máquinas internas. O usuário dele não tem shell, então uma chave vazada não executa nada ali.',
            },
          },
          {
            icon: 'terminal',
            title: { EN: 'Deploy script', PT: 'Script de deploy' },
            tag: 'forced command',
            description: {
              EN: 'The deploy key can run exactly one script: fetch main, install, build, and swap the static files nginx serves.',
              PT: 'A chave de deploy só executa um script: baixa a main, instala, faz o build e troca os arquivos que o nginx serve.',
            },
          },
          {
            icon: 'restart_alt',
            title: { EN: 'Restart & health check', PT: 'Restart e health check' },
            tag: 'systemd',
            description: {
              EN: 'The API restarts and the script checks it came back up. If it did not, the job fails and shows the logs.',
              PT: 'A API reinicia e o script confere se ela voltou. Se não voltou, o job falha e mostra os logs.',
            },
          },
        ],
      },
    ],
  },
};

const STEP_INTERVAL = 2200;

export function HowItReachesYou({ lang }: HowItReachesYouProps) {
  const location = useLocation();
  const [flowId, setFlowId] = useState<FlowId>('request');
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const followNextStep = useRef(false);
  const inView = useInView(timelineRef, { margin: '-100px' });
  const reduceMotion = useReducedMotion();

  const flow = flows[flowId];
  const totalSteps = flow.zones.reduce((sum, zone) => sum + zone.steps.length, 0);
  const finished = active === totalSteps - 1;
  const autoplay = inView && !paused && !reduceMotion && !finished;

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      followNextStep.current = true;
      setActive(current => Math.min(current + 1, totalSteps - 1));
    }, STEP_INTERVAL);
    return () => clearInterval(timer);
  }, [autoplay, totalSteps]);

  // Page scroll follows the packet, but only for steps reached by autoplay (not clicks)
  useEffect(() => {
    if (!followNextStep.current) return;
    followNextStep.current = false;
    stepRefs.current[active]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [active]);

  // Any manual scroll hands control back to the visitor. Starts after a grace period
  // so the wheel/trackpad momentum that brought the section into view doesn't count.
  useEffect(() => {
    if (!autoplay) return;
    const stop = () => setPaused(true);
    const onKey = (event: KeyboardEvent) => {
      if ([' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) stop();
    };
    const grace = setTimeout(() => {
      window.addEventListener('wheel', stop, { passive: true });
      window.addEventListener('touchmove', stop, { passive: true });
      window.addEventListener('keydown', onKey);
    }, 1200);
    return () => {
      clearTimeout(grace);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
      window.removeEventListener('keydown', onKey);
    };
  }, [autoplay]);

  if (location.pathname !== '/') {
    return null;
  }

  const selectFlow = (id: FlowId) => {
    setFlowId(id);
    setActive(0);
    setPaused(false);
  };

  let stepIndex = 0;

  return (
    <section className="w-full border-t border-black/10 dark:border-white/10 py-24 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-16">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="md:col-span-2 md:sticky md:top-24 self-start"
        >
          <span className="font-mono text-xs tracking-widest uppercase text-neutral-500 dark:text-neutral-400">
            {lang === 'PT' ? 'Bastidores' : 'Behind the scenes'}
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {lang === 'PT' ? 'Como este site chega até você' : 'How this site reaches you'}
          </h2>

          <div role="tablist" className="mt-8 grid grid-cols-2 border border-neutral-200 dark:border-neutral-800">
            {(Object.keys(flows) as FlowId[]).map(id => (
              <button
                key={id}
                role="tab"
                aria-selected={flowId === id}
                onClick={() => selectFlow(id)}
                className={`px-4 py-3 text-sm font-mono transition-colors duration-300 ${
                  flowId === id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-white dark:bg-[#151515] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {flows[id].tab[lang]}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={flowId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <p className="mt-6 text-neutral-600 dark:text-neutral-400 leading-relaxed">{flow.intro[lang]}</p>
              <div className="mt-8 grid grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800">
                {flow.facts.map(fact => (
                  <div key={fact.label.EN} className="bg-white dark:bg-[#151515] p-4">
                    <div className="text-3xl font-semibold text-neutral-900 dark:text-white">{fact.value}</div>
                    <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      {fact.label[lang]}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Timeline */}
        <div ref={timelineRef} className="md:col-span-3">
          <AnimatePresence mode="wait">
            <motion.ol
              key={flowId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {flow.zones.map((zone, zoneIndex) => (
                <li key={zone.label.EN}>
                  <div className="flex items-stretch gap-5">
                    <div className="w-10 shrink-0 flex justify-center">
                      {zoneIndex > 0 && (
                        <div
                          className={`w-px transition-colors duration-500 ${
                            !reduceMotion && stepIndex <= active
                              ? 'bg-neutral-900 dark:bg-white'
                              : 'bg-neutral-200 dark:bg-neutral-800'
                          }`}
                        />
                      )}
                    </div>
                    <div className="py-3 flex items-center gap-3 flex-1">
                      <span className="font-mono text-[11px] tracking-widest uppercase text-neutral-400 dark:text-neutral-500">
                        {zone.label[lang]}
                      </span>
                      <div className="flex-1 border-t border-dashed border-neutral-200 dark:border-neutral-800" />
                    </div>
                  </div>

                  <ol>
                    {zone.steps.map(step => {
                      const index = stepIndex++;
                      const isActive = !reduceMotion && index === active;
                      const isPast = !reduceMotion && index < active;
                      const isLast = index === totalSteps - 1;

                      return (
                        <li key={step.icon} ref={el => { stepRefs.current[index] = el; }} className="flex items-stretch gap-5">
                          {/* Rail */}
                          <div className="w-10 shrink-0 flex flex-col items-center">
                            <button
                              onClick={() => { setActive(index); setPaused(true); }}
                              aria-label={step.title[lang]}
                              className={`w-10 h-10 shrink-0 flex items-center justify-center border transition-colors duration-300 ${
                                isActive
                                  ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900'
                                  : isPast
                                    ? 'bg-white dark:bg-[#151515] border-neutral-900 dark:border-neutral-300 text-neutral-900 dark:text-white'
                                    : 'bg-white dark:bg-[#151515] border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[20px] leading-none">{step.icon}</span>
                            </button>
                            {!isLast && (
                              <div className="relative w-px flex-1 min-h-6 bg-neutral-200 dark:bg-neutral-800 overflow-visible">
                                <div
                                  className={`absolute inset-x-0 top-0 bg-neutral-900 dark:bg-white transition-all duration-500 ${isPast ? 'h-full' : 'h-0'}`}
                                />
                                {isActive && autoplay && (
                                  <motion.div
                                    key={`${flowId}-${index}`}
                                    className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-white"
                                    initial={{ top: '0%', opacity: 0 }}
                                    animate={{ top: '100%', opacity: [0, 1, 1, 0] }}
                                    transition={{ duration: STEP_INTERVAL / 1000, ease: 'easeInOut' }}
                                  />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <button
                            onClick={() => { setActive(index); setPaused(true); }}
                            className={`group flex-1 text-left mb-4 p-4 border transition-colors duration-300 ${
                              isActive
                                ? 'bg-white dark:bg-[#151515] border-neutral-900 dark:border-neutral-300'
                                : 'bg-white/60 dark:bg-[#151515]/60 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                              <h3 className="font-medium text-neutral-900 dark:text-white">{step.title[lang]}</h3>
                              <span className="px-2 py-0.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-mono text-[10px] uppercase tracking-wider">
                                {step.tag}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                              {step.description[lang]}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </li>
              ))}
            </motion.ol>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
