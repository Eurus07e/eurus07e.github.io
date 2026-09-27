const filterButtons = [...document.querySelectorAll('[data-filter]')];
const articles = [...document.querySelectorAll('[data-post-category]')];
const resultCount = document.querySelector('[data-result-count]');

if (filterButtons.length && articles.length && resultCount) {
  const selectCategory = (category) => {
    let visible = 0;
    for (const article of articles) {
      const match = category === 'all' || article.dataset.postCategory === category;
      article.hidden = !match;
      if (match) visible += 1;
    }
    for (const button of filterButtons) {
      const active = button.dataset.filter === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    resultCount.textContent = category === 'all'
      ? `Showing all ${visible} articles`
      : `Showing ${visible} ${visible === 1 ? 'article' : 'articles'} in ${category}`;
  };

  for (const button of filterButtons) {
    button.addEventListener('click', () => selectCategory(button.dataset.filter));
  }
}
