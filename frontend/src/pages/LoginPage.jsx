import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAtMAAADWCAYAAAATpg6rAAAZ5klEQVR4nO3d63LrKrYGUGVXv/8r5/xYO2c7XrbFnQmMUdXV3SuJLgjEJ4zw1/f39wUAAOT7Z/YBAADAqoRpAAAoJEwDAEAhYRoAAAoJ0wAAUEiYBgCAQsI0AAAUEqYBAKCQMA0AAIWEaQAAKCRMAwBAIWEaAAAKCdMAAFBImAYAgELCNAAAFBKmAQCgkDANAACFhGkAACgkTAMAQCFhGgAACgnTQKrvf/8DAPzrf7MPAAjvMUB/TTsKAAhImIb99Bo9FqQB4IkwDesz9QIAJhGmYU0pAbpmJPnV9k33AIAnwjSs4y5Atwq4z/v5evGz7xc/A4DjCNMQ36cQ3TrMfgrSj/9fqAaAy9J4ENmnpei+rvFB+tPPzNsG4EjCNMT0Kpx+XX1C9Lv93RGoATieMA3xvAvSEfdnegcARxOmIZZXUy1WCqxGpwE4ihcQIY6cOcu99lmy36832yGWGfULYHtGpiGGGWF09HQS5rlbNxyAQsI0xLRSqBXKADiWMA3xrDK9gzW8m97hegM0YM70GK1H7nSC1DCSfA7zpAE6E6bbGRlQPn2RB+t5vJ6zrqG6s7/nb68EoAFhulzEDsko1Hm+r7zr3Hp6hzoXV8R7FMB2hOk8q3VOgs4aVl1abqVjPr0tPJ/vaecP0I0wfW+lwHAnwnQCPssZac6tmy1Hpb3AGNu7urHT/QwgBGH6tRM6HMF6bTPr6GpB+oT2/MnzXOnI1wpgOcL0f07ucAXr+R6netyNTpdcr1YBOFKQTp268TyNZvc6fvK9DGC4r+/v4++7xxfAG7sHjqg+hb7Seb+tVn9ZMUifouQ+dnqZATRxcpg+9sQz6XDHS6mbo1fwSNnGqIA7arpChGkRudfu1TU4aVQeYLgTp3kI0XkiBIrTtCzrmiCdOqL96WW30sD9rt7VvnR5d+6vtp/TBlKCa8r2Pp1naZvUhgE6OClMC9F1hOpz5EwLeRdWP4XSd9ubPXXj3YNHyVz2kp9/OoaSbT0eu3YL0MkJYVqIbiv3S0KYp1Uwuxthvfu9FKVBs5VP55KyDvinv6+5DrXTeXK3AUCmncO0EN2P0a515bSLmlHYu9+/+2rrHnVrxEPB89+nllPLEemS3wWg0K5hWicyhlAdV6vQnLrtVgHy7ndbTrvIPYacbXzabkp51wbpnH0BUGG3MC1Ez2HqR3w9r8+n9Z2v6/MKE69+Z2ZdajEq/encXkkZGS+Zj61NAgzwz+wDaEiQnuv7cg2imDW3+LEO3I0Yf135YfPr6b8//W1JQG3xJTZ3Qbp2dZJ328n9OQCN7BKmhbg4XIu5ZoxQPofokpfv7n4WYa3n1CBcc6wtRqVbznUH4MbqYdpoaEyuSRy916yunZ7RYjm5u7/pNSr9yqcHiR77yKFdAnSw8pxpHUNsXk5MV/uy2rvtjCj73FHQklHpmVKnkVxX/YucrV46/CRiGQMsbdUwLUivw8uJ77WckjE6SJdsP3e+8IxR6Xcj7blzlEeNSqfuxz0ToJMVp3noFNbjmt17nmucI2L51obJXudUuhxf6TZSj8OoNMCiVgvTEUMDaVy731qVR8Ql0WathzyrjvV4UEi5rj3W8wYg0yrTPHbrDHq/FBaVKR9tRQzSr+SOuuZM//i0vF6LEeUe22ixj9wgHbFeAGxhhTC9Ulh8NKrzuttPtPITqNuY8bJhip7TM2rOMfeLVB5/93kbn34n5zg+fZPjp+NMPRdBGmCAr+/vaFnrl9AH92SVDitKma5SXr2UhuHZo9HvXtArWXP5eVuftvHuvFP2+ypUvir/3LZRup7zXQjOLddWq8EAUCBymA57YP/aoZOaXcY7lGGNFl+2MaMMc+pNzdJ5qft5FYSf/y11qsmnlT1yH4BKpp6Urok9+yEL4FhRw3TIg/rXrh3UKi9v7aa03COUW6tpBC2m/kQenTW1CWBjEcN0uAO6zusIR1+D08r3WauR3lNFGrUH4DArvIA406mdcclH7TVOH7k7+dxrCNEATBcpTEcZkdYR/5az+kGN0wM1n+XMnwaAYSKF6dl0wp+NCNUCNY/u5kFHXR4QgINECdMzR6V1wHl6h2qB+mylLxKqMwBMESFMC9JrKlmXFz7JWd5N3QMghAhhegYhuo1eo9RGp89ztyb0u99N+X0A6GZ2mLYE2x56hGqB+hw561UL0gCEMjNMjwzSszrcmnNcMSS0nvohUO8vp76Y2gFAOLPC9G5Busf55HzsHcmopfTYS4uv5gaA4WZP8+itV2c7IiiuHhRajVIbnd5X6vQOQRqAsGaE6VWDaI/j3j0QtBqlFqjPJUgDENroML1akBag27CMHiUEaQDC+/r+Hppxeu+sRUcrQPdTW7bKcT/P7wa8qyOuPQAhjQzT0YN06+PT+b8mUPOs9FsPAWC6UdM8egZpIXotpnzwTJsBYFn/zD6ASpGC9NclFKSqKSdBHAAIY8TIdK/wEyWQCdBlrEcNACxv1ZHp0gD7fbULb0ai2ygpQwEcAAihd5iOtDKG0ei4lCcAsKTVRqZLRzGNRseXW65GpwGA6XrOmY6wSkbLEA0AAL+sMjItSJ/B6DQAsJReI9MzQ4650WuzDjUtPX/DIrCm535BeyaMUV/aUiOnwQjSe8gJ1N+Xa8VvHsZgH6/as3s+oUQP0zOCtEYagxFqSryrM9o1rEVbZhk9wvSMUCtI70mgXlvOtev1babaNLSR2p57fjOx9kxIUUemBWlymOoxRs8Hm9LgreOFfBHb8qe/1ZYJrXWYHj2KKEjvz+j0WCuUdcoxatOcTluGQSKOTKc2HEH6HCmB2uh0vhU6W+CetgwTRQvTgjTvGKGuN7P8UqdmtPKzD22cXc2+H/60rd7HYXlLwvv6/m7WDlpsKKWhCNJnM0c2T4RvIm2l9lzUD1anPf+hLRNKpJFpQZpapnr8oZ28ZrSa1ezalmvPy2g1oUQJ0xoDqUz3eG3UJ0Oz3J1f6qoAjz+LfL6ca/e2fCenLT/+fOVzZnFRwnSKXZ/QodQp0x5yg/TjvwnVrEJ7/tyW7/5We2aaVnOme899EqR5dvJ6pCfNNSwJ0iO2Ba1oz/9ptQjBauXC4maPTI+s8BrXGXaeN13a6a5aHq07zLvR6p3rDvGUtOeV62fL9pzSlnO3CcVmh+kU5sfyyklzp0/rdK+r77X9VHd0wvSmPf+t9Pw8IBPCPxP3bXoHtXa/rt9Xfhv4utYvlxHfinZXTqc8qDGO9tyPtsxULcJ09Iq6+o2IM53Y6c6gE6a3U0P0dY39unBtmWlmjUyPHJVmb6/q0sp1J7fj3aXT/TGy803Z3sp1iflODdHXNaftaMtMMXOaxwi73JQ4w8kh+rrmBOmU7eqEKXFye0499x7nrC0z3IwwbVSa1nbohHI73t1o8+wi59Ol3UJ0jp7nLVAzVMSRaS8dcprTO96Zo1ip29cB/6dkDvApTn8ovq44dUN7ZpjapfFK5oONsOtNiv1ECZLRnX7+ETzXVcsI/qYtKwMOFW1k2tMipVa8Oet44rV5o1l/uxuJPrVcSuzcllNFKQP1lmaihekWojRU5op+oxSklcEKorejKGa+PBtFxLqye5kTxMgwfVepIzZE1rLKjVOIjN3ejU7/cdK51hCk3dM43I4j07ADnc4fymEOQTqNIL12XVn52AmkJky3rIRW8OAUOl+jWNGpo+0op/8oC7ZVu5pHKo2IUSu/fBXsaxQhJe614Q91NN1dWZ1QTh6M4RoXpkfQWPfyff13TZ9v2Lte613Pq4SyiMl14YcHY/hXhDCtQe6v9Bq/+7vHf3/VuUcenT6ZaxKbkdZ0yiqdsmB7I8K0hnSWlE6m53z7qPVN55tudlkI/dSYXX9H0EbgwS6reZxw82ptxlcCj7hOj+e1yg3/hPq7yrU4Ve7D3t2nQ+zLV6bDk9lhWgc73nOInrEqixvsWXS+sfnUJM+n8lJWscgYDNF7mocbSywpc5B/9L52n6Z7vHvxcFW7nEdvEe4XrhW8t9uD8QrHyAJmj0y3oDGkyQ0JudNAooaQqMf1Y/f6G738c+12vUpGpU3xAHgQYTWPla3y8WhNoLkbPa5h1Y297TaKBZ/sXodXa8/6FobZYWR6htRR29mNuedLhrkv+r27uUa46cJ1zW+vo9WOSjPXyGuxWpBOscpxsoCeI9N3FXWlm3KLkd3RDXdU+abuJ7Ucdpsv/cmsOjFqVZVUq3RqqxxnCynnelJ5RHPC/bGG8mGo1ad5lNzMUwNF68ZY8pJfq7+J5K78ox8/ezqt3p12vrt6/KbYnvtItcoD1irHySJWD9O5Xi0JN/OjzOdj+Lkxftr/u5d/dI584iPh92qmKe0o5UH3pPJgLSt+kryzI8r0tDD9yqtAO+sYcve/coBe+dhpY5Wba6/jXGkKmPYax8iHmlMejJ//7ogA2NlRZTrrBcTZgfXdz0cd15aVibdmX++oo9IRzDre5wfoKOVmrjQlItSJVkE6d5v87bgyPWE1j0gd1Y9ox7O7qOU94bie9xGh07uuGMcxa3rHzPpoVHptHozLWZ1mjCPLtCZMf+pkInSU13XoRYVJVmpvEedJzy4/o9JpZr08HTVIR6gTs9sOh9t5ZFrjIpIZHbDO97WIQXoEo9LrKlnZ6RQ9pndQ5tgyXTlMf7qRHHtB4V8639dmB+mo9yaj0nl2XtrTgzFkWjlMvxJxfjT8GNUBjw7Sq3S+J3e8RqXX5cH4b6l9fe101NPLOdexZbpTmHbjh9jtQJCO6dgOsFLvh+N3gfH0B+PUY6w9PnWeZLuE6cgBAh717IDfbSNK5zuLIJ3PF7Sk6dWeZ7TlHLsE6Xe/F6WcV/SpTLct19ovbbn7tr7eVujII5h9nfjt3fUoXdQ+esd7XXOOZdQIVqoIa1rT3qf23Kot/+ynp+j1pFd7jnSf3MVxZbryNyBGb/gRfD39b2UWx6frkRKq767liJtZ5PoULUinmHEsd6scRCqfyO4ekH9+550I7TlV1CUjI5URh1k5TPOZG0t8d19hXxpWo137kcfTa87nCqP/r+TWoRlfJPQsepm+czdgUVK2u39qcme3ID3zkwc6EqbPYnQ6prtQnbONUSLWox4d7902S6fmPIsyKp3z8xw59aVVmc7Qoi0/bieaiOE+alk9SjmfkmlBBCFM72vlDulUz9dqhxG8aNNNUo+ndES35Hx7lVHNqHSrY6oJlSvfw1Zqy9FGf3sdz4xrUNIGS45j1tSskWUaevpZizAdebQz8rGN4ml33fOPetxR2tTMEJ07Ahltmkhu2MuVu73H43n+2x3uYasff2819aXlMYx+iHx1H0k9jpTpgbXBvHQbj9uqLdOadxFSt1l93Xcfmf65kFE6/1keK7TyYJQII64tp3S82l7P9jQrgNd2nrX7qQkY5Jk9Kj0yRI/q+6LcR0a8E9K7TFuOfHe99ruH6esSqKGlWZ1v75e3Zq1FXXJeKcEy50WnVh+ftn7Icd/eV4SR6B5G3UdahczI7WvUOTapWyeEaf6mk2IVI1ZA6N0BRm5rrY5t9ggn+UZfs8irmbSwUpCeNXgw2rB7b6swPSucpc5bnPnxSY/9wwwjOt/RywGu2Kn0Cjc9y7B0+9HKnjwrBeje962adcZTtQrSrfS6p9R8MpeznWSrj0w/v+3ds5L0aODvtjmishudpofRc9hmdoAp20iZQjHy5b+7ecot99Vi+/QxYxnJlvsqMfrdhkeRVsdJMXOaSE2QnpZpVg/TP3oVYK+PZErWd+1xjgI1qUrrSa96WyvSiPSIwYBn70J+zmj1yCXMhPF2RgWyFFGua6RPtkofumcOzr0y+tpOnYffMkzvFMx6VYLaN5F/7FLOrCGnvkUNz49adYCtl1dKuYe2+Hjz1dJzuUYG6cd/jxK+TrFCe04xYwT1uuZPu+g5zSbKqHSIPDRrZDpi8I4YoO+22epj8mjXoiWd71oiXK8eH8lGOa8WIXh0kC7dHn9bYb7sLlq+I7BsyGyo5Tk2r5u7TPMoUTvXsuTvW3euOZ3juyUCvzK3w1lGvhgzQq/VK0ac34g1dludh5e09xelTdeq7ctrttnjvZG7e1PJOxW5WpfpXZDOOccuWofplUJZbiBu8dHou78vaXgtKusuN0PmWqUeRZ3eMcLIzj/a0oT8cerLoiNf8K3ZTos5z6PuTTNzXu05dimTk0emryvOPLyU4+g5P8noNK+cFnJaBunah+VnPeZerjJ6vFMdi+60sh65StejVqE39+XhFUelP/1emOktPcL0TyhLWbEiSni7e3t81HHOKo/HUB3lmrRwWsfQ0k714LranE+0F4VK9WwXqwT005z2YPwj4qh0jxVzRr6fMbrNvntHrOWc9Gr/dNruTo1yxZt9zTI/P6PUcGenelKySkbK+bd6N+JOaliKtARYip3q2Cwr9mEjzKivLadhvAqZpcE86qh0bpCeVtd7henVtVwto5d3U0NqG8Xz1A/Os9soVuvl5u7aRu59o/Q+8/3wnzu9r1fPj3bpb6X2PEuP+0jp/loG6Zl6Lt1X+3dZx3bSnOm7J5nHyhm14j17N5Lc4uXIn23uNvWDeqd0vKWj0SW/m7ON3nOja/fXyqgXs3cW4UFrlij9Vsl9JOXYW9X7moUYepo58p59nrPDdMugVvu0EqXh5ep13Ku/nLhrB9Hbatf5Tu5o0uiXAEeNYvcUZVRam//t5CB9p3W4Sr2PtCrvnCA96p7RukxnrZpUVF6zw/QIETuflTyOfivLvZ3a+bZaNq72byJuo+cqQp+0XKoPelv13hl1VPpZiykxrff5y05h+nFqghtsW8/TSZTvmSJ2BrVajiCNHmWO8IC7Y53YwarhrpWpH/lX7Ctnfz0+KSvVs0xHjrwXbytCmG7ZIczuWHa20rSPyJ1Ej1HQFqIeV43Rc4tbencso+dst9ZrVHrGuUYNrFGP6xSrlO0Ko9KzyjJ7vxHCNGvZdU3qXlqMVu62bmgULcs1N9itUOarPGCNPI4V2vOd2fvvbeSodOuyNCqdt92W16eqvIRpSv1M/VghFMxSctN49TfvlkFs4dRRrJnn1KoDiDyH8ZWV50q3ass//96r/q3yAES50e9SzLjPzKynRfuOEqaFsjVFnKceobOoCQ2tlzmsFaE8o5sx3aB3vWi9/V7zGkeUd2l7brGsYQ5BOsj82QD7m91vvDPyHIc+MEQJ06zLah+/te7QenaAO3e+Pd7uXknNOe5cL3Kt0p7de++1LvsZ7WD0PmfcC2aeY/G+I30D4kk36N30nIaQY/b+70Q6PoGpjdZzpSPNhWyl1xzJ2e8SRGkjp07V6iniqHSrKVCzplJtXU8jhWnWFiVQz7RKyFklJES3yvXOEXl6x0irtJGtA0pDkecIr3oNZ5ZpjweGqjKOFqYjVhjSrfZCVEu7dL5RjjO653LcZa70nV7nGW1UegWrhrBeZreNnZzw0mHTc4wWplmfG9rfonRork0foz5+bTldomb7JdurbQOmd/wmSPex+6h01HXPWyo5x+pyiRim3QDINbvOrBBSUwLC7HJcRYTrPWt925LtqVdtCdJ5Sh92Zz+0zdrmjCUsl3zp8FHEMA2pBMA0K4y0rWrG9I7o16v1sa507r0J0mNECdLLh8wES0/v+BF1aTzLrPGKTiLPyR1vr3vI7DWlU+cWl74cVLtuvBHufk5uz71Fmkb0Y/RSfie+fNysjKOGafZS00Gv0DlEfPjT8bY3+xr3/gbMlvOae2zvVFFHMXdxtyb9CV+m8mxU291m5D1ymI4YUMjzXFlPvdnnjhTW7ivFqdfiuupGbn+UvuSSc09LmZ5Tc49sGSJ6B+lT66v2nK6kPdTUsxb3kXeihMwWZRpF108fzJmmFzf38XS8v7Wer9tyu7n7zd3nXV0o3f6r7aZuK+qLYM9Gfxz+bh+pny6d0p5ba11vc/bVy6djfdd2e3469cnIetu9/COPTF+X0ekVnXpjv6urPUenhej33l2Xu+vRK0R/qifv/r1mqbvnv21xXncj2iVan/vKtOe2fsrz03TDu7JseR+5M+tTzJJR9tp3LHobNhjy9f0dtQx+WeIgD+fGPn6ectRRgIhq7yGRr1vpubXe9urLZT0buQpO7jWcXTaR9SzLFveREfWqdRm0zmCzRvu7tZtVwvR1CdRRuan/1jtQ63TLRbr5tu5QZwaIkjJaYbnGEQ/H2nMfPa9dzX0k4gNay4fglPOMfI7FhGlquLG/NuMmVrP900Ra6WTkChg9HuJabzNanV3pUwT+1rOOldxHRoXMnvtLKdOR07ZCPJivFKavS6COwE09zcy66hpBO9oy8NFqYfq6xt7Y3t3Iliu0Sm7o5SK8xQ3Ui9D3AAGtGKava/+bmgC2n17X1DWEsbRl4JdVw/R1tb2hrXQTa3HeK53vjmquoWsHsZgHDYdbOUxfV7tAvcNNLcQkfACAk6wepq9LoAYAYJIdvk585DI3AADw/3YI09clUAMAMMEuYfq62gZqoRoAgFs7henrmvM1lQAAHGq3MH1dAjUAAIPsGKavS6AGAGCAXcP0df0J1OZRAwDQzc5h+kfrUWqhGgCA67rOCNPX1f4LWQRqAACOCdPX1Xbax3UZpQYAON5JYfqHUA0AQBMnhukfQjUAAFVODtM/esynFqwBAA4gTP/RepT6h1ANALCx/80+gGAeA3XLEPy4rR6hHQCACYTp90YE6+f9AACwEGE6Ta9g/Wl7QjYAQHDCdL6ewfqRkA0AEJwwXec52PYM10I0AEAwwnRbAi8AwEEsjQcAAIWEaQAAKCRMAwBAIWEaAAAKCdMAAFBImAYAgELCNAAAFBKmAQCgkDANAACFhGkAACj0f+yuSAm7+HiIAAAAAElFTkSuQmCC';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.login, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Nieprawidłowy login lub hasło');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');
        .lp{font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;overflow:hidden}
        .lp-l{width:45%;background:#0a0e1a;position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:48px;overflow:hidden;animation:lpfi .8s ease both}
        .lp-l::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 70%,rgba(100,130,200,.15) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(80,110,180,.08) 0%,transparent 50%);pointer-events:none}
        .lp-d{position:absolute;height:1px;left:0;right:0;background:rgba(176,138,80,.15)}
        .lp-d.t{top:130px}.lp-d.b{bottom:100px}
        .lp-s{position:relative;z-index:1}
        .lp-img{width:100%;max-width:260px;height:auto;object-fit:contain;object-position:left;opacity:.92;display:block}
        .lp-dv{width:100%;height:1px;background:rgba(176,138,80,.25);margin:14px 0}
        .lp-an{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:300;color:rgba(240,235,224,.75);letter-spacing:1px;margin-bottom:4px}
        .lp-an span{font-style:italic;color:#b08a50}
        .lp-q{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:38px;font-weight:300;color:#f0ebe0;line-height:1.35;margin-bottom:18px}
        .lp-q em{color:#b08a50;font-style:normal}
        .lp-sb{font-size:13px;font-weight:300;color:rgba(240,235,224,.82);letter-spacing:.5px;line-height:1.7;max-width:280px}
        .lp-rg{display:flex;align-items:center;gap:16px;position:relative}
        .lp-rg::after{content:'';position:absolute;bottom:-10px;left:0;width:220px;height:18px;background:radial-gradient(ellipse at center,rgba(176,138,80,.45) 0%,transparent 70%);filter:blur(6px);pointer-events:none}
        .lp-rsvg{opacity:.35}
        .lp-rt{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:rgba(240,235,224,.78);letter-spacing:1px}
        .lp-r{flex:1;display:flex;align-items:center;justify-content:center;padding:48px;background:#f8f6f3}
        .lp-w{width:100%;max-width:360px}
        .lp-h1{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:400;color:#1c1a17;line-height:1.2;margin-bottom:6px;animation:lpfu .6s ease .1s both}
        .lp-h2{font-size:13px;color:#9a9590;font-weight:300;margin-bottom:40px;animation:lpfu .6s ease .1s both}
        .lp-g1{animation:lpfu .6s ease .2s both}
        .lp-g2{animation:lpfu .6s ease .28s both}
        .lp-lb{display:block;font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:#9a9590;margin-bottom:8px}
        .lp-in{width:100%;padding:14px 16px;background:#fff;border:1px solid #e4e0da;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:300;color:#1c1a17;outline:none;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none;box-sizing:border-box;margin-bottom:20px;display:block}
        .lp-in::placeholder{color:#ccc8c0}
        .lp-in:focus{border-color:#b08a50;box-shadow:0 0 0 3px rgba(176,138,80,.1)}
        .lp-btn{width:100%;padding:15px;margin-top:8px;background:#1c1a17;color:#f0ebe0;border:none;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .1s;position:relative;overflow:hidden;animation:lpfu .6s ease .36s both}
        .lp-btn::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:#b08a50}
        .lp-btn:hover:not(:disabled){background:#2c2820}
        .lp-btn:active{transform:scale(.99)}
        .lp-btn:disabled{opacity:.6;cursor:not-allowed}
        .lp-fgt{display:block;text-align:center;margin-top:22px;font-size:12px;color:#9a9590;letter-spacing:.5px;text-decoration:none;transition:color .2s}
        .lp-fgt:hover{color:#b08a50}
        @keyframes lpfi{from{opacity:0}to{opacity:1}}
        @keyframes lpfu{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:700px){
          .lp{flex-direction:column}
          .lp-l{width:100%;min-height:180px;padding:32px}
          .lp-q{font-size:26px}
          .lp-rg{display:none}
          .lp-r{padding:32px 24px}
        }
      `}</style>

      <div className="lp">

        <div className="lp-l">
          <div className="lp-d t" />
          <div className="lp-d b" />
          <div className="lp-s">
            <p className="lp-an">Strefa <span>Państwa Młodych</span></p>
            <div className="lp-dv" />
            <img src={LOGO} alt="Pensjonat Perla Pienin" className="lp-img" />
          </div>
          <div className="lp-s">
            <div className="lp-q">Twój ślub,<br /><em>Twoje zasady.</em></div>
            <p className="lp-sb">Wszystko, czego potrzebujesz do planowania wymarzonego wesela– w jednym miejscu.</p>
          </div>
          <div className="lp-s">
            <div className="lp-rg">
              <svg className="lp-rsvg" width="48" height="24" viewBox="0 0 48 24" fill="none">
                <circle cx="16" cy="12" r="10" stroke="#b08a50" strokeWidth="1.5"/>
                <circle cx="32" cy="12" r="10" stroke="#b08a50" strokeWidth="1.5"/>
              </svg>
              <span className="lp-rt">Twoja historia zaczyna się tutaj</span>
            </div>
          </div>
        </div>

        <div className="lp-r">
          <div className="lp-w">
            <h1 className="lp-h1">Witaj z powrotem</h1>
            <p className="lp-h2">Zaloguj się, aby kontynuować planowanie</p>
            <form onSubmit={handleSubmit}>
              <div className="lp-g1">
                <label className="lp-lb" htmlFor="lp-login">Login</label>
                <input id="lp-login" type="text" className="lp-in" placeholder="Wpisz login" autoComplete="username" value={form.login} onChange={e => setForm({...form, login: e.target.value})} required />
              </div>
              <div className="lp-g2">
                <label className="lp-lb" htmlFor="lp-pass">Hasło</label>
                <input id="lp-pass" type="password" className="lp-in" placeholder="••••••••" autoComplete="current-password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              <button type="submit" className="lp-btn" disabled={loading}>{loading ? 'Logowanie...' : 'Zaloguj się'}</button>
            </form>
            <Link to="/forgot-password" className="lp-fgt">Nie pamiętasz hasła?</Link>
          </div>
        </div>

      </div>
    </>
  );
}
