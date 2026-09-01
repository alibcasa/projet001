import {QcmClient} from '@/components/qcm/qcm-client'
export default function QcmPage(){return <div><h1 className="text-3xl font-bold">QCM</h1><p className="mt-2 text-zinc-500">Générez des QCM traçables depuis un ou plusieurs PDF.</p><div className="mt-6"><QcmClient/></div></div>}
