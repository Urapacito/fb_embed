const url = 'https://video.fhan18-1.fna.fbcdn.net/o1/v/t2/f2/m366/AQPRMTOt4vzzZseHo8a7s9_5AxA6EWo1PyJ71Xf6lV4WjuRvg6LzwY1cx6KYOEsjnPzGstEQV0jw6KhJ6_4E1nuTOHhLhHBDlJJ_N9o.mp4?_nc_cat=102&_nc_oc=Adq44n3G5xonHTC8uQYwwbak16XGW-xG-pvgE081NN4iYMFBuALC8ZOBIDeCmITyBMI&_nc_sid=9ca052&_nc_ht=video.fhan18-1.fna.fbcdn.net&_nc_ohc=6bEBrmmvDZ8Q7kNvwHTyCpv&efg=eyJ2ZW5jb2RlX3RhZyI6ImRhc2hfcjJhdjEtcjFnZW4ydnA5X3E0MCIsInZpZGVvX2lkIjo5OTAxNzUxNTM0MDk5ODIsIm9pbF91cmxnZW5fYXBwX2lkIjowLCJjbGllbnRfbmFtZSI6InVua25vd24iLCJ4cHZfYXNzZXRfaWQiOjE1NDUyNDczNjM2ODc1MjMsImFzc2V0X2FnZV9kYXlzIjozLCJ2aV91c2VjYXNlX2lkIjoxMDEyMiwiZHVyYXRpb25fcyI6MTYsImJpdHJhdGUiOjk0MTg2LCJ1cmxnZW5fc291cmNlIjoid3d3In0%3D&ccb=17-1&_nc_gid=G0wCYTtbxy71GaxEw-Poew&_nc_ss=7a289&_nc_zt=28&oh=00_Af5ITL2Jy4ciN1O5_l58ddwXy37osLfbHiO8qv5_XVNAaw&oe=6A15B48F&bytestart=66272&byteend=264848';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://www.facebook.com/reel/990175153409982',
  'Accept': '*/*',
};

async function tryHead(u) {
  try {
    const res = await fetch(u, { method: 'HEAD', headers, redirect: 'follow' });
    console.log('HEAD', u);
    console.log('  status:', res.status);
    console.log('  content-type:', res.headers.get('content-type'));
    console.log('  content-length:', res.headers.get('content-length'));
    console.log('  accept-ranges:', res.headers.get('accept-ranges'));
    console.log('  final-url:', res.url);
  } catch (e) {
    console.error('HEAD error', e && e.message ? e.message : e);
  }
}

async function tryRange(u) {
  try {
    const rheaders = { ...headers, Range: 'bytes=0-1' };
    const res = await fetch(u, { method: 'GET', headers: rheaders, redirect: 'follow' });
    console.log('RANGE', u);
    console.log('  status:', res.status);
    console.log('  content-type:', res.headers.get('content-type'));
    console.log('  content-length:', res.headers.get('content-length'));
    console.log('  content-range:', res.headers.get('content-range'));
    console.log('  final-url:', res.url);
    const buf = await res.arrayBuffer();
    console.log('  bytesReceived:', buf.byteLength);
  } catch (e) {
    console.error('RANGE error', e && e.message ? e.message : e);
  }
}

(async () => {
  console.log('Trying original URL');
  await tryHead(url);
  await tryRange(url);

  console.log('\nTrying cleaned URL (remove bytestart/byteend)');
  try {
    const u = new URL(url);
    u.searchParams.delete('bytestart');
    u.searchParams.delete('byteend');
    const clean = u.toString();
    await tryHead(clean);
    await tryRange(clean);
  } catch (e) {
    console.error('clean URL error', e && e.message ? e.message : e);
  }
})();
