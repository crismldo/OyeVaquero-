import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import "./Principal.css"
import userpng from '../assets/images/user1.png';

function Principal(){

    useEffect(() => {
        const existingScript = document.getElementById("principal-effects-script")
        if (existingScript) {
            existingScript.remove()
        }

        delete window.__principalEffectsInitialized

        const script = document.createElement("script")
        script.id = "principal-effects-script"
        script.src = `/principal-main.js?v=${Date.now()}`
        script.defer = true
        document.body.appendChild(script)

        return () => {
            script.remove()
            delete window.__principalEffectsInitialized
        }
    }, [])

    return(
        <>
            <section className="hero" aria-labelledby="hero-title">
                <div className="hero-inner">
                    <h1 id="hero-title" className="hero-title" aria-live="polite">
                        <span className="word">Renta.</span>
                        <span className="word">Explora.</span>
                        <span className="word">Muévete.</span>
                    </h1>
                    <p className="hero-sub">
                        Renta en minutos, sin complicaciones.
                    </p>
                </div>

                <div className="hero-bg" role="presentation" aria-hidden="true">
                    <img className="hero-video" src="/img/1e.jpg" alt="" />
                </div>
            </section>

            {/* data-no-reveal evita que el script externo aplique reveal-on-scroll al catálogo */}
            <section id="catalogo" className="section-catalogo" data-no-reveal>
                <div className="container">
                    <div className="catalogo-intro">
                        <p className="catalogo-kicker">Catalogo</p>
                        <h2>Encuentra tu proximo ride</h2>
                        <p className="catalogo-copy">Elige el vehiculo ideal para tu dia, desde trayectos cortos hasta recorridos largos por la ciudad.</p>
                    </div>

                    <div className="catalogo-grid">
                        <article className="catalogo-card">
                            <div className="catalogo-card-image" style={{ backgroundImage: "url('/img/patin.jpeg')" }} role="img" aria-label="Scooter electrico"></div>
                            <div className="catalogo-card-body">
                                <h3>Scooter Electrico</h3>
                                <p>Agil, rapido y perfecto para moverte entre avenidas con estilo.</p>
                                <Link to="/renta" className="catalogo-card-link">Reservar</Link>
                            </div>
                        </article>

                        <article className="catalogo-card featured">
                            <div className="catalogo-card-image" style={{ backgroundImage: "url('/img/bici.jpeg')" }} role="img" aria-label="Bicicleta electrica"></div>
                            <div className="catalogo-card-body">
                                <h3>Bicicleta Electrica</h3>
                                <p>Comoda para recorridos largos y paseos con una conduccion suave.</p>
                                <Link to="/renta" className="catalogo-card-link">Reservar</Link>
                            </div>
                        </article>

                        <article className="catalogo-card">
                            <div className="catalogo-card-image" style={{ backgroundImage: "url('/img/88.png')" }} role="img" aria-label="Patineta electrica"></div>
                            <div className="catalogo-card-body">
                                <h3>Patineta Electrica</h3>
                                <p>Compacta y divertida para trayectos urbanos cortos y rapidos.</p>
                                <Link to="/renta" className="catalogo-card-link">Reservar</Link>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

        </>
    )
}

export default Principal;
