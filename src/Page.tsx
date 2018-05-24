class Page {
    title: string;
    url: string;
    fullTitle: string;

    constructor(url, title, fullTitle) {
        this.title = title;
        this.fullTitle = fullTitle;
        this.url = url;
    }
}

export default Page;
