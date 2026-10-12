import { useTranslation } from 'react-i18next';

export default function KyotoHeroSystems({ showSystem, hasToggled, onViewChange }) {
  const { t } = useTranslation();
  return (
    <>
      <div id="kyoto-hero-systems" className={`kyoto-systems${hasToggled ? ' was-toggled' : ''}`} aria-hidden={!showSystem} inert={!showSystem}>
    <p className="xray__label"><span className="chip">Blueprint</span>{t('home.redesign.heroSystems.label')}</p>

    <div className="graph-wrap" tabIndex="0" aria-label={t('home.redesign.heroSystems.scrollLabel')}>
    <svg className="graph" viewBox="0 0 760 350" role="img" aria-labelledby="kyoto-graph-title kyoto-graph-desc">
      <title id="kyoto-graph-title">{t('home.redesign.heroSystems.graphTitle')}</title>
      <desc id="kyoto-graph-desc">{t('home.redesign.heroSystems.graphDescription')}</desc>
      <g className="comment">
        <rect className="frame" x="4" y="4" width="752" height="342" rx="6"/>
        <rect className="bar" x="4" y="4" width="752" height="26" rx="6"/>
        <text x="18" y="21">{t('home.redesign.heroSystems.graphCaption')}</text>
      </g>
      {/* Verified execution and data connections; positions adapted for the hero. */}
      <path className="wire wire--exec" pathLength="1" style={{ '--d': '2.2s' }} d="M214 94 C240 94 240 94 280 94"/>
      <path className="wire wire--exec" pathLength="1" style={{ '--d': '2.4s' }} d="M446 94 C475 94 475 94 520 94"/>
      <path className="wire wire--exec" pathLength="1" style={{ '--d': '2.65s' }} d="M214 174 C240 174 240 174 280 174"/>
      <path className="wire wire--exec" pathLength="1" style={{ '--d': '2.85s' }} d="M446 174 C475 174 475 174 520 174"/>
      <path className="wire wire--exec" pathLength="1" style={{ '--d': '3.15s' }} d="M214 254 C310 254 420 254 520 254"/>
      <path className="wire wire--obj" pathLength="1" style={{ '--d': '2.3s' }} d="M214 317 C250 317 244 282 244 254 L244 154 C244 132 258 118 280 118"/>
      <path className="wire wire--obj" pathLength="1" style={{ '--d': '2.7s' }} d="M244 234 C244 212 258 198 280 198"/>
      <g transform="translate(20 54)"><g className="node" style={{ '--d': '2.05s' }}>
        <rect className="body" width="204" height="62" rx="6"/><path className="h-event" d="M0 6a6 6 0 0 1 6-6h192a6 6 0 0 1 6 6v18H0z"/>
        <text className="title" x="10" y="16">Event OnPickedUpEvent</text><text className="pin-label" x="154" y="44">then</text><path className="exec" d="M194 34l9 6-9 6z"/>
      </g></g>
      <g transform="translate(270 54)"><g className="node" style={{ '--d': '2.25s' }}>
        <rect className="body" width="186" height="70" rx="6"/><path className="h-func" d="M0 6a6 6 0 0 1 6-6h174a6 6 0 0 1 6 6v18H0z"/>
        <text className="title" x="10" y="16">Set Visibility</text><path className="exec" d="M5 34l9 6-9 6z"/><path className="exec" d="M176 34l9 6-9 6z"/>
        <text className="pin-label" x="24" y="44">New Visibility: false</text><circle className="obj" cx="10" cy="64" r="4.5"/><text className="pin-label" x="24" y="64">Target · children: true</text>
      </g></g>
      <g transform="translate(510 54)"><g className="node" style={{ '--d': '2.45s' }}>
        <rect className="body" width="230" height="62" rx="6"/><path className="h-func" d="M0 6a6 6 0 0 1 6-6h218a6 6 0 0 1 6 6v18H0z"/>
        <text className="title" x="10" y="16">PostEvent</text><path className="exec" d="M5 34l9 6-9 6z"/><text className="pin-label" x="24" y="44">E_Flag_StateChange_OnPickup</text>
      </g></g>
      <g transform="translate(20 134)"><g className="node" style={{ '--d': '2.5s' }}>
        <rect className="body" width="204" height="62" rx="6"/><path className="h-event" d="M0 6a6 6 0 0 1 6-6h192a6 6 0 0 1 6 6v18H0z"/>
        <text className="title" x="10" y="16">Event OnRespawnEvent</text><text className="pin-label" x="154" y="44">then</text><path className="exec" d="M194 34l9 6-9 6z"/>
      </g></g>
      <g transform="translate(270 134)"><g className="node" style={{ '--d': '2.7s' }}>
        <rect className="body" width="186" height="70" rx="6"/><path className="h-func" d="M0 6a6 6 0 0 1 6-6h174a6 6 0 0 1 6 6v18H0z"/>
        <text className="title" x="10" y="16">Set Visibility</text><path className="exec" d="M5 34l9 6-9 6z"/><path className="exec" d="M176 34l9 6-9 6z"/>
        <text className="pin-label" x="24" y="44">New Visibility: true</text><circle className="obj" cx="10" cy="64" r="4.5"/><text className="pin-label" x="24" y="64">Target · children: true</text>
      </g></g>
      <g transform="translate(510 134)"><g className="node" style={{ '--d': '2.9s' }}>
        <rect className="body" width="230" height="62" rx="6"/><path className="h-func" d="M0 6a6 6 0 0 1 6-6h218a6 6 0 0 1 6 6v18H0z"/>
        <text className="title" x="10" y="16">PostEvent</text><path className="exec" d="M5 34l9 6-9 6z"/><text className="pin-label" x="24" y="44">E_Flag_StateChange_OnDrop</text>
      </g></g>
      <g transform="translate(20 214)"><g className="node" style={{ '--d': '3s' }}>
        <rect className="body" width="204" height="62" rx="6"/><path className="h-event" d="M0 6a6 6 0 0 1 6-6h192a6 6 0 0 1 6 6v18H0z"/>
        <text className="title" x="10" y="16">Event OnFlagReturnedHome</text><text className="pin-label" x="154" y="44">then</text><path className="exec" d="M194 34l9 6-9 6z"/>
      </g></g>
      <g transform="translate(510 214)"><g className="node" style={{ '--d': '3.3s' }}>
        <rect className="body" width="230" height="62" rx="6"/><path className="h-func" d="M0 6a6 6 0 0 1 6-6h218a6 6 0 0 1 6 6v18H0z"/>
        <text className="title" x="10" y="16">PostEvent</text><path className="exec" d="M5 34l9 6-9 6z"/><text className="pin-label" x="24" y="44">E_Flag_StateChange_OnSecure</text>
      </g></g>
      <g transform="translate(38 294)"><g className="node" style={{ '--d': '2.1s' }}>
        <rect className="body" width="186" height="38" rx="6"/><text className="title" x="10" y="24">Get CollisionComp</text><circle className="obj" cx="176" cy="23" r="4.5"/>
      </g></g>
    </svg>
    </div>
    <p className="graph-hint">{t('home.redesign.heroSystems.scrollHint')}</p>

    <figure className="code">
      <figcaption><span><b>KyotoPickupFlag.cpp</b> · Kyoto Conflict</span><span>C++ · GivePickupTo</span></figcaption>
      <div className="code__scroll"><pre><code><span className="ln"><span className="k">void</span> <span className="t">AKyotoPickupFlag</span>::<span className="f">GivePickupTo</span>(<span className="k">class</span> <span className="t">AKyotoCharacter</span>* player)</span><span className="ln">&#123;</span><span className="ln">    <span className="k">if</span> (<span className="t">AKyotoGameState_TeamCTF</span>* state =</span><span className="ln">        <span className="f">Cast</span>&lt;<span className="t">AKyotoGameState_TeamCTF</span>&gt;(<span className="f">GetWorld</span>()-&gt;<span className="f">GetGameState</span>()))</span><span className="ln">    &#123;</span><span className="ln ln--hit" style={{ '--hit-delay': '4.1s' }}>        state-&gt;<span className="f">SetFlagStatus</span>(<span className="t">EKyotoFlagStatus</span>::Held);</span><span className="ln">        state-&gt;<span className="f">OnRepFlagUpdate</span>();</span><span className="ln">        state-&gt;<span className="f">LastMinuteAudio</span>();</span><span className="ln">    &#125;</span><span className="ln"> </span><span className="ln">    <span className="f">Cast</span>&lt;<span className="t">AKyotoPlayerState_TeamCTF</span>&gt;(player-&gt;<span className="f">GetPlayerState</span>())</span><span className="ln ln--hit" style={{ '--hit-delay': '4.6s' }}>        -&gt;<span className="f">ServerRPC_SetHasFlag</span>(<span className="k">true</span>);</span><span className="ln">    FlagHolder = <span className="f">TWeakObjectPtr</span>(player);</span><span className="ln ln--hit" style={{ '--hit-delay': '5.1s' }}>    FlagHolder-&gt;DropFlagDelegate.<span className="f">BindUFunction</span>(<span className="k">this</span>, <span className="s">"DropFlag"</span>);</span><span className="ln">    bIsActive = <span className="k">false</span>;</span><span className="ln">    bShouldRotate = <span className="k">true</span>;</span><span className="ln">&#125;</span></code></pre></div>
      <p className="code__note">{t('home.redesign.heroSystems.codeNote')}</p>
    </figure>
      </div>
      <div className="kyoto-view-toggle" role="group" aria-label={t('home.redesign.heroSystems.viewLabel')}>
        <button type="button" aria-controls="kyoto-hero-systems" aria-pressed={!showSystem} onClick={() => onViewChange(false)}>{t('home.redesign.heroSystems.playerView')}</button>
        <button type="button" aria-controls="kyoto-hero-systems" aria-pressed={showSystem} onClick={() => onViewChange(true)}>{t('home.redesign.heroSystems.systemView')}</button>
      </div>
    </>
  );
}
