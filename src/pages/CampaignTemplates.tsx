import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CampaignTemplatesSection } from './Campaigns';

export default function CampaignTemplates(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-small text-muted-light dark:text-muted-dark hover:text-current mb-2">
            <ArrowRight className="h-3.5 w-3.5" />
            العودة إلى الحملات
          </Link>
          <h1 className="text-h1 font-bold">قوالب الحملات</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1">
            قوالب جاهزة لحملاتك المتكررة — استخدمها مع نقرة واحدة
          </p>
        </div>
      </div>

      <CampaignTemplatesSection
        onUseTemplate={(t) => {
          navigate('/campaigns', { state: { useTemplate: t } });
        }}
      />
    </div>
  );
}
