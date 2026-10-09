import { useTranslation } from 'react-i18next';

const FlowList = ({ steps, className = '' }) => (
  <ol className={'case-flow__path ' + className}>
    {steps.map(step => <li key={step.name}><strong>{step.name}</strong><span>{step.detail}</span></li>)}
  </ol>
);

export default function CaseStudy({ projectId }) {
  const { t } = useTranslation();
  const study = t('projects.' + projectId + '.caseStudy', { returnObjects: true, defaultValue: null });
  if (!study || typeof study !== 'object') return null;

  return (
    <div className="case-study">
      <section className="editorial-section case-role" aria-labelledby="case-role-title">
        <div className="section-label"><span>01</span><h2 id="case-role-title">{study.roleLabel}</h2></div>
        <div>
          <p className="case-role__lead">{study.roleLead}</p>
          <ul className="case-ownership">{study.ownership.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="case-context">{study.context}</p>
        </div>
      </section>

      <section className="editorial-section" aria-labelledby="case-flow-title">
        <div className="section-label"><span>02</span><h2 id="case-flow-title">{study.flowLabel}</h2></div>
        <figure className="case-figure">
          <figcaption>{study.flowIntro}</figcaption>
          <div className="case-flow">
            <p className="case-flow__label">{study.flowMainLabel}</p>
            <FlowList steps={study.flowMain} />
            <p className="case-flow__label">{study.flowBranchLabel}</p>
            <FlowList steps={study.flowBranch} className="case-flow__path--branch" />
          </div>
        </figure>
      </section>

      <section className="editorial-section" aria-labelledby="case-authority-title">
        <div className="section-label"><span>03</span><h2 id="case-authority-title">{study.authorityLabel}</h2></div>
        <figure className="case-figure">
          <figcaption>{study.authorityIntro}</figcaption>
          <ol className="case-authority">
            {study.authority.map(node => <li key={node.role}><strong>{node.role}</strong><span>{node.detail}</span></li>)}
          </ol>
        </figure>
      </section>

      <section className="editorial-section" aria-labelledby="case-decisions-title">
        <div className="section-label"><span>04</span><h2 id="case-decisions-title">{study.decisionsLabel}</h2></div>
        <dl className="contribution-list">
          {study.decisions.map(decision => <div key={decision.title}><dt>{decision.title}</dt><dd>{decision.body}</dd></div>)}
        </dl>
      </section>
    </div>
  );
}
