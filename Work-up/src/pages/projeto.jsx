import React, { useState, useEffect } from "react";
import "../css/projetos.css";
import api from "../service/api";
import Footer from "../components/Footer"
import Toast from "../components/Toast";
import LoginCard from "../components/LoginCard";
import ConfirmDialog from "../components/ConfirmDialog";
import { FaFolder, FaClipboardList, FaCalendarAlt, FaClock } from "react-icons/fa";

const LINGUAGENS_OPTIONS = [
    "JavaScript", "Python", "Java", "C#", "C++", "React", "Angular", 
    "Vue.js", "Node.js", "Spring Boot", "SQL", "MongoDB", "AWS", "Docker"
];


export default function ProjetosList() {
    const [projetos, setProjetos] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalProjeto, setModalProjeto] = useState(null);
    const [showLogin, setShowLogin] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [projetoToCancel, setProjetoToCancel] = useState(null);

    
    const [nome, setNome] = useState("");
    const [descricao, setDescricao] = useState("");
    const [tags, setTags] = useState([]); 
    const [regime, setRegime] = useState("PJ"); 
    const [dataInicio, setDataInicio] = useState(""); 
    const [dataFim, setDataFim] = useState(""); 

    const [filtroTexto, setFiltroTexto] = useState(""); 
    
    const [filtroRegime, setFiltroRegime] = useState("TODOS"); 
    const [filtroTag, setFiltroTag] = useState("TODAS"); 
    
    const [modoAluno, setModoAluno] = useState("TODOS"); 
    const [projetosInscritosIds, setProjetosInscritosIds] = useState([]);
    
    const [toast, setToast] = useState(null);

    const baseURL = "/api/projetos";
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");
    const role = user?.role || "";
    
    const parseTagsString = (tagsString) => {
        if (!tagsString || typeof tagsString !== 'string') return [];
        return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    };
    
    const parseDate = (dateData) => {
        if (!dateData) return null;
        
        if (Array.isArray(dateData) && dateData.length >= 3) {
            const date = new Date(dateData[0], dateData[1] - 1, dateData[2]);
            if (isNaN(date)) return null;
            return date;
        }
        
        const date = new Date(dateData);
        if (isNaN(date)) return null;
        return date;
    }

    const getDurationInMonths = (start, end) => {
        if (!start || !end) return "N/I";
        
        const startDate = parseDate(start);
        const endDate = parseDate(end);

        if (!startDate || !endDate) return "N/I";
        
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) return `${diffDays} dias`;
        
        const diffMonths = Math.round(diffDays / 30.44); 
        return `${diffMonths} meses`;
    }

    const generateTagClassName = (tag) => {
        if (tag === "C++") {
            return "tag-c-plus-plus"; 
        }
        
        return `tag-${tag
            .replace(/\s/g, '-')
            .replace(/\+\+/g, 'plus-plus')
            .replace(/\#/g, 'sharp')
            .replace(/\./g, '-')
            .toLowerCase()
        }`;
    }
    
    const fetchProjetos = async () => {
        try {
            let url = `${baseURL}/public`;
            let config = {};
            let isFetchingInscricoes = false;
            let isFetchingMeusProjetos = false;

            if (role === "ROLE_EMPRESA" && token) {
                url = `${baseURL}/meus`;
                config = { headers: { Authorization: `Bearer ${token}` } };
                isFetchingMeusProjetos = true;
            } else if (role === "ROLE_ALUNO" && token) {
                if (modoAluno === "INSCRITOS") {
                    url = `${baseURL}/inscricoes`;
                    config = { headers: { Authorization: `Bearer ${token}` } };
                    isFetchingInscricoes = true; 
                } else {
                    url = `${baseURL}/public`;
                    config = {};
                }
            }

            const res = await api.get(url, config);
            
            if (role === "ROLE_ALUNO" && token) {
                const inscricoesRes = await api.get(`${baseURL}/inscricoes`, 
                    { headers: { Authorization: `Bearer ${token}` } });
                    
                const ids = inscricoesRes.data.map(p => p.id); 
                setProjetosInscritosIds(ids);
            } else {
                setProjetosInscritosIds([]); 
            }

            if (Array.isArray(res.data)) {
                const projetosFormatados = res.data.map((p) => ({
                    id: p.id,
                    nome: p.nome,
                    descricao: p.descricao,
                    dataCriacao: p.dataCriacao,
                    empresaNome: p.empresaNome || p.empresa?.nome || "Não informado",
                    encerrado: p.encerrado || p.isEncerrado || false,
                    
                    tags: parseTagsString(p.tags),
                    
                    regime: p.regime || "N/I",
                    dataInicio: p.dataInicio, 
                    dataFim: p.dataFim,
                    
                    statusInscricao: isFetchingInscricoes ? p.status : undefined,
                    totalCandidatos: isFetchingMeusProjetos ? p.totalCandidatos : 0,
                    aprovados: isFetchingMeusProjetos ? p.aprovados : 0,
                }));

                console.log("Projetos carregados:", projetosFormatados);
                setProjetos(projetosFormatados);
            } else {
                setProjetos([]);
            }
        } catch (err) {
            console.error("Erro ao buscar projetos:", err.response?.data || err.message);
            setProjetos([]);
        }
    };

    useEffect(() => {
        fetchProjetos();
    }, [role, token, modoAluno]);

    const resetForm = () => {
        setNome("");
        setDescricao("");
        setTags([]);
        setRegime("PJ");
        setDataInicio("");
        setDataFim("");
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!nome || !descricao || !dataInicio || !dataFim || tags.length === 0) {
            setToast && setToast({ message: "Preencha todos os campos obrigatórios (Nome, Descrição, Datas e Tags).", type: 'error' });
            return;
        }

        try {
            const res = await api.post(
                `${baseURL}/criar`,
                { 
                    nome, 
                    descricao,
                    tags: tags.join(","), 
                    regime,
                    dataInicio,
                    dataFim,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const novoProjeto = {
                id: res.data.id,
                nome: res.data.nome,
                descricao: res.data.descricao,
                dataCriacao: res.data.dataCriacao,
                empresaNome: res.data.empresaNome || res.data.empresa?.nome || "Não informado",
                encerrado: res.data.encerrado || false,
                
                tags: parseTagsString(res.data.tags),
                
                regime: res.data.regime,
                dataInicio: res.data.dataInicio,
                dataFim: res.data.dataFim,
                totalCandidatos: 0, 
                aprovados: 0,
            };

            setProjetos([...projetos, novoProjeto]);
            setToast && setToast({ message: `Projeto criado com sucesso: ${novoProjeto.nome}`, type: 'success' });
            setShowModal(false);
            resetForm();
        } catch (err) {
            console.error("Erro ao criar projeto:", err.response?.data || err.message);
            setToast && setToast({ message: "Erro ao criar projeto. Verifique se está logado como empresa.", type: 'error' });
        }
    };
    
    const handleTagChange = (e) => {
        const value = e.target.value;
        const isChecked = e.target.checked;
        
        setTags(prevTags => {
            if (isChecked) {
                return [...prevTags, value];
            } else {
                return prevTags.filter(tag => tag !== value);
            }
        });
    };
    
    // 🚩 ATUALIZADA: Abre o ConfirmDialog
    const handleEncerrarProjeto = async (id) => {
        setProjetoToCancel(id);
        setShowConfirmDialog(true);
    };

    // 🚩 ADICIONADA: Função de confirmação de encerramento
    const confirmEncerrarProjeto = async () => {
        const id = projetoToCancel;
        
        try {
            await api.post(
                `${baseURL}/${id}/encerrar`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setProjetos(
                projetos.map((p) => (p.id === id ? { ...p, encerrado: true } : p))
            );
            
            setToast && setToast({ message: "Projeto encerrado com sucesso!", type: 'success' });

        } catch (err) {
            console.error("Erro ao encerrar projeto:", err.response?.data || err.message);
            setToast && setToast({ message: "Você não tem permissão para encerrar este projeto.", type: 'error' });
        } finally {
            setProjetoToCancel(null);
            setShowConfirmDialog(false);
        }
    };

    const handleInscrever = async (projetoId) => {
        if (!token) {
        setShowLogin(true);
        return;
        }
        try {
            await api.post(
                `${baseURL}/${projetoId}/inscrever`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setToast({
                message: 'Inscrição realizada com sucesso!',
                type: 'success'
            });
            
            setProjetosInscritosIds([...projetosInscritosIds, projetoId]);

        } catch (err) {
            const msg = err.response?.data || "Erro ao se inscrever. Tente novamente.";
            console.error("Erro ao se inscrever:", err.response?.data || err.message);
            setToast({
                message: msg,
                type: 'error'
            });
        }
    };

    const handleCancelRegistration = (projetoId) => {
        setProjetoToCancel(projetoId);
        setShowConfirmDialog(true);
    };

    const confirmCancelRegistration = async () => {
        try {
            await api.delete(
                `${baseURL}/${projetoToCancel}/cancelar-inscricao`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setToast({
                message: 'Inscrição cancelada com sucesso!',
                type: 'success'
            });

            setProjetos(projetos.filter(p => p.id !== projetoToCancel));
            setProjetosInscritosIds(prevIds => prevIds.filter(id => id !== projetoToCancel));
            setProjetoToCancel(null);
            setShowConfirmDialog(false);

        } catch (err) {
            const msg = err.response?.data || "Erro ao cancelar inscrição. Tente novamente.";
            console.error("Erro ao cancelar inscrição:", err.response?.data || err.message);
            setToast({
                message: msg,
                type: 'error'
            });
            setProjetoToCancel(null);
            setShowConfirmDialog(false);
        }
    };

    // ATUALIZADA: Função unificada para fechar o diálogo
    const cancelDialog = () => {
        setShowConfirmDialog(false);
        setProjetoToCancel(null);
    };

    const projetosOrdenados = [...projetos].sort((a, b) => {
        const dateA = parseDate(a.dataCriacao);
        const dateB = parseDate(b.dataCriacao);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
    });

    const projetosFiltrados = projetosOrdenados.filter((p) => {
        const textoMin = filtroTexto.toLowerCase();
        const matchesTexto = 
            p.nome?.toLowerCase().includes(textoMin) ||
            p.tags?.some(tag => tag.toLowerCase().includes(textoMin));
            
        const matchesRegime = 
            filtroRegime === "TODOS" || 
            p.regime?.toUpperCase() === filtroRegime;
            
        const matchesTag = 
            filtroTag === "TODAS" ||
            p.tags?.includes(filtroTag);
            
        return matchesTexto && matchesRegime && matchesTag;
    });

    return (
        <>
            <div className="container page-projetos">
                <div className="projetos-container">
                <div className="top-bar">
                    <h1 className="titulo-projetos">
                        {role === "ROLE_EMPRESA" 
                            ? <><FaFolder /> Meus Projetos</> 
                            : modoAluno === "INSCRITOS" ? <><FaClipboardList /> Minhas Inscrições</> : <><FaClipboardList /> Projetos Disponíveis</>
                        }
                    </h1>
                    <div className="actions">
                        {role === "ROLE_ALUNO" && (
                            <button
                                className={`meus-projetos-btn ${modoAluno === 'INSCRITOS' ? 'active' : ''}`}
                                onClick={() => setModoAluno((prev) => 
                                    prev === "TODOS" ? "INSCRITOS" : "TODOS"
                                )}
                            >
                                {modoAluno === "TODOS" ? "Minhas Inscrições" : "Ver Todos"}
                            </button>
                        )}

                        {/* DASHBOARD CANDIDATOS (Apenas Empresa) */}
                        {role === "ROLE_EMPRESA" && (
                            <a 
                                href="/dashboard" 
                                className="btn-candidatos-dashboard" 
                            >
                                Candidatos
                            </a>
                        )}

                        {/* Botão Criar Projeto SÓ DEVE APARECER para a EMPRESA */}
                        {role === "ROLE_EMPRESA" && (
                            <button 
                                className="criar-projeto-btn" 
                                onClick={() => {setShowModal(true); resetForm();}}
                            >
                                + Criar Projeto
                            </button>
                        )}

                    </div>
                </div>

                {/* SEÇÃO DE FILTROS */}
                <div className="filter-controls-bar">
                    <input
                        className="search-input"
                        placeholder="Buscar projeto ou tag..." 
                        value={filtroTexto}
                        onChange={(e) => setFiltroTexto(e.target.value)}
                    />
                    
                    {/* Filtro de Regime */}
                    <select
                        className="filter-select"
                        value={filtroRegime}
                        onChange={(e) => setFiltroRegime(e.target.value)}
                    >
                        <option value="TODOS">Regime: Todos</option>
                        <option value="PJ">PJ</option>
                        <option value="CLT">CLT</option>
                    </select>
                    
                    {/* Filtro de Tag Específica */}
                    <select
                        className="filter-select"
                        value={filtroTag}
                        onChange={(e) => setFiltroTag(e.target.value)}
                    >
                        <option value="TODAS">Tecnologia: Todas</option>
                        {LINGUAGENS_OPTIONS.map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>

                <div className="lista-projetos-grid"> 
                    {projetosFiltrados.length > 0 ? (
                        projetosFiltrados.map((p) => (
                            <div
                                key={p.id}
                                className={`project-card ${p.encerrado ? "encerrado" : ""}`}
                            >
                                <div className="project-header">
                                    <h3 className="project-title-link">{p.nome}</h3>
                                    <div className="status-tags">
                                        <span className={`status-regime regime-${p.regime?.toLowerCase()}`}>{p.regime}</span>
                                        {p.encerrado && <span className="status-tag encerrado">Encerrado</span>}
                                    </div>
                                </div>

                                
                                
                                <div className="card-info-group">
                                    <span className="card-info">
                                        <FaCalendarAlt /> Início: {p.dataInicio ? parseDate(p.dataInicio).toLocaleDateString("pt-BR") : "N/I"}
                                    </span>
                                    <span className="card-info">
                                        <FaClock /> Duração: {getDurationInMonths(p.dataInicio, p.dataFim)}
                                    </span>
                                </div>
                                
                                {/* GERAÇÃO DE TAGS */}
                                <div className="tags-list">
                                    {p.tags.map(tag => {
                                        const className = generateTagClassName(tag); 
                                        return (
                                            <span 
                                                key={tag} 
                                                className={`tag-chip ${className}`} 
                                            >
                                                {tag}
                                            </span>
                                        );
                                    })}
                                </div>

                                <p className="descricao-resumida">{p.descricao}</p> 

                                <div className="project-footer">
                                    <div className="project-info">
                                        <span>Empresa: {p.empresaNome}</span>
                                        <span>
                                            Criado em:{" "}
                                            {parseDate(p.dataCriacao) ? parseDate(p.dataCriacao).toLocaleDateString("pt-BR") : "-"}
                                        </span>
                                        {role === "ROLE_EMPRESA" && p.aprovados > 0 && (
                                            <span className="aprovados-count-footer">
                                                Aprovados: 
                                                <strong style={{ color: 'var(--color-success)', marginLeft: '5px' }}>{p.aprovados}</strong>
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Lógica do Botão para ALUNO (Inscrever / Inscrito / Cancelar) */}
                                        {!p.encerrado && (role === "ROLE_ALUNO" || !token) && (                                        <>
                                            {modoAluno === "INSCRITOS" ? (
                                                <div className="status-and-action">
                                                    <span className={`status-tag status-${(p.statusInscricao || 'PENDENTE').toLowerCase()}`}>
                                                        {p.statusInscricao || 'PENDENTE'}
                                                    </span>
                                                    
                                                    {p.statusInscricao === 'PENDENTE' && (
                                                        <button
                                                            className="cancelar-inscricao-btn"
                                                            onClick={() => handleCancelRegistration(p.id)}
                                                        >
                                                            Cancelar Inscrição
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                         <button
                                            className={`inscrever-btn ${projetosInscritosIds.includes(p.id) ? 'inscrito' : ''}`}
                                            onClick={() => setModalProjeto(p)}
                                            disabled={projetosInscritosIds.includes(p.id)}
                                            >
                                            {projetosInscritosIds.includes(p.id) ? 'Inscrito' : 'Inscrever-se'}
                                            </button>
                                            )}
                                        </>
                                    )}

                                    <div className="project-actions">
                                        {!p.encerrado && role === "ROLE_EMPRESA" && (
                                            <button
                                                className="encerrar-btn"
                                                // 🚩 MUDANÇA AQUI: Usa a nova função que abre o modal
                                                onClick={() => handleEncerrarProjeto(p.id)}
                                            >
                                                Encerrar Projeto
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="sem-projetos">Nenhum projeto encontrado</p>
                    )}
                </div>
                {showLogin && (
                    <div className="modal-overlay" onClick={() => setShowLogin(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <LoginCard
                        onLoginSuccess={() => {
                            setShowLogin(false);
                            window.location.reload();
                        }}
                        onClose={() => setShowLogin(false)}
                        onShowToast={setToast}
                        />
                    </div>
                    </div>
                )}
                {modalProjeto && (
                    <div className="modal-overlay" onClick={() => setModalProjeto(null)}>
                        <div
                            className="modal-content large-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2>{modalProjeto.nome}</h2>
                            <div
                                style={{
                                    maxHeight: "300px",
                                    overflowY: "auto",
                                    marginBottom: "20px",
                                    lineHeight: "1.6",
                                }}
                            >
                                <p>{modalProjeto.descricao}</p>
                            </div>
                            <div className="modal-buttons">
                                <button
                                    className="cancelar-btn"
                                    onClick={() => setModalProjeto(null)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="salvar-btn"
                                    onClick={() => {
                                        handleInscrever(modalProjeto.id);
                                        setModalProjeto(null);
                                    }}
                                >
                                    Confirmar Inscrição
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* MODAL DE CRIAÇÃO */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => {setShowModal(false); resetForm();}}>
                        <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
                            <h2>Novo Projeto</h2>
                            <form onSubmit={handleCreateProject} className="create-project-form">
                                
                                <input
                                    placeholder="Nome do Projeto"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    required
                                />
                                <textarea
                                    placeholder="Descrição Completa do Projeto"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    rows="6"
                                    required
                                />

                                <div className="form-row">
                                    <label>
                                        Data de Início:
                                        <input 
                                            type="date" 
                                            value={dataInicio}
                                            onChange={(e) => setDataInicio(e.target.value)}
                                            required
                                        />
                                    </label>
                                    <label>
                                        Data de Fim (Previsão):
                                        <input 
                                            type="date" 
                                            value={dataFim}
                                            onChange={(e) => setDataFim(e.target.value)}
                                            required
                                        />
                                    </label>
                                </div>

                                <div className="form-regime">
                                    <label>Regime de Contratação:</label>
                                    <div className="radio-group-modal">
                                        <label>
                                            <input 
                                                type="radio" 
                                                value="PJ" 
                                                checked={regime === "PJ"}
                                                onChange={(e) => setRegime(e.target.value)}
                                            />
                                            Pessoa Jurídica (PJ)
                                        </label>
                                        <label>
                                            <input 
                                                type="radio" 
                                                value="CLT" 
                                                checked={regime === "CLT"}
                                                onChange={(e) => setRegime(e.target.value)}
                                            />
                                            CLT
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group-tags">
                                    <label>Tags / Linguagens de Programação:</label>
                                    <div className="tag-checkbox-group">
                                        {LINGUAGENS_OPTIONS.map(lang => (
                                            <label key={lang} className="tag-checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    value={lang}
                                                    checked={tags.includes(lang)}
                                                    onChange={handleTagChange}
                                                    required={tags.length === 0}
                                                />
                                                <span className={`tag-chip ${generateTagClassName(lang)} checkbox-style`}>
                                                    {lang}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <small>Selecione uma ou mais tecnologias.</small>
                                </div>
                                
                                <div className="modal-buttons">
                                    <button
                                        type="button"
                                        className="cancelar-btn"
                                        onClick={() => {setShowModal(false); resetForm();}}
                                    >
                                        Cancelar
                                    </button>
                                    <button type="submit" className="salvar-btn">
                                        Criar Projeto
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                </div>
            </div>
        <Footer /> 
        
        {/* Toast Notifications */}
        {toast && (
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
            />
        )}
        
        {/* 🚩 Confirm Dialog UNIFICADO */}
        {showConfirmDialog && (
            <ConfirmDialog
                // A mensagem muda dependendo se o aluno está na tela de "Minhas Inscrições" ou se é a empresa encerrando um projeto
                message={
                    (modoAluno === "INSCRITOS") 
                    ? "Tem certeza que deseja cancelar sua inscrição? Esta ação não pode ser desfeita."
                    : "Tem certeza que deseja encerrar este projeto? Esta ação não pode ser desfeita e o projeto será marcado como Encerrado."
                }
                // A função de confirmação é escolhida baseada no contexto
                onConfirm={
                    (modoAluno === "INSCRITOS") 
                    ? confirmCancelRegistration 
                    : confirmEncerrarProjeto
                }
                onCancel={cancelDialog}
            />
        )}
        </> 
    );
}